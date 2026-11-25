use std::collections::HashSet;
use std::hash::Hash;

const MAX_TRIGGER_ITERATIONS: usize = 5;
const MAX_AUTOMATIC_TRANSITIONS: usize = 100;
pub(crate) const AUTOMATIC_LOOP_CODE: &str = "ERR_RUNTIME_INFINITE_LOOP";

pub(crate) fn automatic_loop_message(node: &str) -> String {
    format!(
        "Infinite loop detected: exceeded {MAX_AUTOMATIC_TRANSITIONS} automatic transitions at node \"{node}\""
    )
}

/// Complete a successful transition in engine order. Host functions act on
/// native or live JS state and supply their own callback/error representation.
pub(crate) fn finish_transition<S, E>(
    mut state: S,
    mut fire_next_trigger: impl FnMut(&mut S) -> Result<bool, E>,
    mut advance_automatic: impl FnMut(&mut S, bool) -> Result<bool, E>,
) -> Result<S, E> {
    for _ in 0..MAX_TRIGGER_ITERATIONS {
        if !fire_next_trigger(&mut state)? {
            break;
        }
    }
    for count in 0..=MAX_AUTOMATIC_TRANSITIONS {
        if !advance_automatic(&mut state, count == MAX_AUTOMATIC_TRANSITIONS)? {
            break;
        }
    }
    Ok(state)
}

#[derive(Clone, Copy)]
pub(crate) enum PathEnding {
    MaxDepth,
    Ending,
    DeadEnd,
}

impl PathEnding {
    pub(crate) fn as_str(self) -> &'static str {
        match self {
            Self::MaxDepth => "max-depth",
            Self::Ending => "ending",
            Self::DeadEnd => "dead-end",
        }
    }
}

pub(crate) trait PathHost {
    type State;
    type Transition;
    type PathStep: Clone;
    type Path;
    type Fingerprint: Clone + Eq + Hash;
    type Error;

    fn fingerprint(&self, state: &Self::State) -> Result<Self::Fingerprint, Self::Error>;
    fn ending(&self, state: &Self::State) -> Result<bool, Self::Error>;
    fn available(&self, state: &Self::State) -> Result<Vec<Self::Transition>, Self::Error>;
    fn take(&self, state: &Self::State, transition: &Self::Transition) -> FollowedTransition<Self>;
    fn path(
        &self,
        state: &Self::State,
        steps: &[Self::PathStep],
        ending: PathEnding,
    ) -> Result<Self::Path, Self::Error>;
}

type FollowedTransition<H> =
    Result<Option<(<H as PathHost>::State, <H as PathHost>::PathStep)>, <H as PathHost>::Error>;

enum Frame<State, Fingerprint, Step> {
    Enter {
        fingerprint: Fingerprint,
        state: Box<State>,
        step: Option<Step>,
    },
    Leave(Fingerprint),
}

/// Enumerate in declaration order, preserving eager evaluation of sibling
/// transitions and branch-local cycle detection for each host.
pub(crate) fn enumerate<H: PathHost>(
    host: &H,
    start: H::State,
    max_depth: f64,
    max_paths: f64,
) -> Result<Vec<H::Path>, H::Error> {
    let mut pending = vec![Frame::Enter {
        fingerprint: host.fingerprint(&start)?,
        state: Box::new(start),
        step: None,
    }];
    let mut paths = Vec::new();
    let mut steps = Vec::new();
    let mut ancestors = HashSet::new();

    while (paths.len() as f64) < max_paths {
        let Some(frame) = pending.pop() else {
            break;
        };
        let (fingerprint, state, step) = match frame {
            Frame::Enter {
                fingerprint,
                state,
                step,
            } => (fingerprint, state, step),
            Frame::Leave(fingerprint) => {
                ancestors.remove(&fingerprint);
                steps.pop();
                continue;
            }
        };
        if let Some(step) = step {
            steps.push(step);
            pending.push(Frame::Leave(fingerprint.clone()));
        }
        ancestors.insert(fingerprint);

        let ending = if steps.len() as f64 >= max_depth {
            Some(PathEnding::MaxDepth)
        } else if host.ending(&state)? {
            Some(PathEnding::Ending)
        } else {
            let available = host.available(&state)?;
            if available.is_empty() {
                Some(PathEnding::DeadEnd)
            } else {
                // Run every sibling before descending, including siblings
                // beyond the path cap that may raise a transition error.
                for transition in available.iter().rev() {
                    let Some((state, step)) = host.take(&state, transition)? else {
                        continue;
                    };
                    let fingerprint = host.fingerprint(&state)?;
                    if !ancestors.contains(&fingerprint) {
                        pending.push(Frame::Enter {
                            fingerprint,
                            state: Box::new(state),
                            step: Some(step),
                        });
                    }
                }
                None
            }
        };
        if let Some(ending) = ending {
            paths.push(host.path(&state, &steps, ending)?);
        }
    }
    Ok(paths)
}
