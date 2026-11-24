use std::collections::{BTreeMap, BTreeSet, HashSet};

use crate::blueprint::{
    Condition, EdgeBlueprint, EnumerationContext, EnumerationError, EnumerationRequest,
    EnumerationResponse, GraphBlueprint, NodeBlueprint, PathStep, SerializedEntityState,
    SerializedState, StateTrigger, TraversalPath,
};
use crate::conditions;
use crate::effects;
use crate::fingerprint::{Fingerprint, visit_checks};
use crate::state::RuntimeState;

pub fn enumerate_paths(request: &EnumerationRequest) -> EnumerationResponse {
    let graph = ParsedGraph::new(&request.blueprint);
    match graph.enumerate(
        request.max_depth.unwrap_or(50.0),
        request.max_paths.unwrap_or(100.0),
        request.context.as_ref(),
        request.triggers.as_deref().unwrap_or_default(),
    ) {
        Ok(paths) => EnumerationResponse {
            paths: Some(paths),
            error: None,
        },
        Err(error) => EnumerationResponse {
            paths: None,
            error: Some(error),
        },
    }
}

struct ParsedGraph<'a> {
    start: Option<&'a str>,
    endings: BTreeSet<&'a str>,
    nodes: BTreeMap<&'a str, &'a NodeBlueprint>,
    outgoing: BTreeMap<&'a str, Vec<&'a EdgeBlueprint>>,
    blueprint: &'a GraphBlueprint,
}

impl<'a> ParsedGraph<'a> {
    fn new(blueprint: &'a GraphBlueprint) -> Self {
        let first_node = blueprint.nodes.first().map(|node| node.id.as_str());
        let mut outgoing: BTreeMap<&str, Vec<_>> = BTreeMap::new();
        for edge in &blueprint.edges {
            outgoing.entry(edge.source.as_str()).or_default().push(edge);
        }
        let endings = match &blueprint.endings {
            Some(endings) => endings.iter().map(String::as_str).collect(),
            None => blueprint
                .nodes
                .iter()
                .map(|node| node.id.as_str())
                .filter(|id| Some(*id) != first_node && !outgoing.contains_key(id))
                .collect(),
        };
        Self {
            start: blueprint.start_node.as_deref().or(first_node),
            endings,
            nodes: blueprint
                .nodes
                .iter()
                .map(|node| (node.id.as_str(), node))
                .collect(),
            outgoing,
            blueprint,
        }
    }

    fn available<'b>(
        &'b self,
        state: &'b RuntimeState,
        context: Option<&'b EnumerationContext>,
    ) -> impl DoubleEndedIterator<Item = &'a EdgeBlueprint> + 'b {
        self.outgoing
            .get(state.current_node.as_str())
            .into_iter()
            .flatten()
            .copied()
            .filter(move |edge| {
                conditions_match(state, edge.visibility.as_deref(), context)
                    && conditions_match(state, edge.conditions.as_deref(), context)
            })
    }

    fn step(
        &self,
        state: &RuntimeState,
        edge: &EdgeBlueprint,
        context: Option<&EnumerationContext>,
        triggers: &[StateTrigger],
    ) -> Result<RuntimeState, EnumerationError> {
        let mut state = state.clone();
        apply_edge(&mut state, edge);
        let mut fired = HashSet::new();
        for _ in 0..5 {
            let Some(trigger) = triggers.iter().find(|trigger| {
                !fired.contains(&trigger.id)
                    && conditions_match(&state, Some(&trigger.conditions), context)
            }) else {
                break;
            };
            fired.insert(&trigger.id);
            effects::apply_all(&mut state, &trigger.effects);
        }

        for step in 0..=100 {
            let Some(node) = self.nodes.get(state.current_node.as_str()) else {
                break;
            };
            if !node.auto_resolve.unwrap_or(false) {
                break;
            }
            if step == 100 {
                return Err(EnumerationError {
                    code: "ERR_RUNTIME_INFINITE_LOOP".into(),
                    message: format!(
                        "Infinite loop detected: exceeded 100 automatic transitions at node \"{}\"",
                        state.current_node,
                    ),
                });
            }
            effects::apply_all(
                &mut state,
                node.enter_effects.as_deref().unwrap_or_default(),
            );
            let Some(next_edge) = self.available(&state, context).next() else {
                break;
            };
            apply_edge(&mut state, next_edge);
        }
        Ok(state)
    }

    fn enumerate(
        &self,
        max_depth: f64,
        max_paths: f64,
        context: Option<&EnumerationContext>,
        triggers: &[StateTrigger],
    ) -> Result<Vec<TraversalPath>, EnumerationError> {
        if max_paths <= 0.0 {
            return Ok(Vec::new());
        }

        let Some(start) = self.start else {
            // A blueprint without a start has undefined node IDs in TypeScript.
            let mut state = serialize(&RuntimeState::initial(""));
            state.current_node_id = None;
            state.visited = vec![None];
            return Ok(vec![TraversalPath {
                steps: Vec::new(),
                final_node_id: None,
                ended_at: if max_depth <= 0.0 {
                    "max-depth"
                } else {
                    "dead-end"
                }
                .into(),
                state,
            }]);
        };

        let visit_checks = visit_checks(self.blueprint, triggers);
        let start_state = RuntimeState::initial(start);
        let mut pending = vec![Frame::Enter {
            fingerprint: Fingerprint::of(&start_state, &visit_checks)?,
            state: Box::new(start_state),
            step: None,
        }];
        let mut paths = Vec::new();
        let mut steps = Vec::new();
        let mut ancestors = HashSet::new();

        while let Some(frame) = pending.pop() {
            let Frame::Enter {
                fingerprint,
                state,
                step,
            } = frame
            else {
                if let Frame::Leave(fingerprint) = frame {
                    ancestors.remove(&fingerprint);
                    steps.pop();
                }
                continue;
            };

            if let Some(step) = step {
                steps.push(step);
                pending.push(Frame::Leave(fingerprint.clone()));
            }
            ancestors.insert(fingerprint);

            let ended_at = if steps.len() as f64 >= max_depth {
                Some("max-depth")
            } else if self.endings.contains(state.current_node.as_str()) {
                Some("ending")
            } else {
                let mut available = self.available(&state, context).rev().peekable();
                if available.peek().is_none() {
                    Some("dead-end")
                } else {
                    // TypeScript evaluates every sibling in reverse declaration order
                    // before traversing the first child, even when maxPaths is small.
                    for edge in available {
                        let next = self.step(&state, edge, context, triggers)?;
                        let fingerprint = Fingerprint::of(&next, &visit_checks)?;
                        if !ancestors.contains(&fingerprint) {
                            pending.push(Frame::Enter {
                                step: Some(PathStep {
                                    transition_id: edge.id.clone(),
                                    from_node_id: state.current_node.clone(),
                                    to_node_id: next.current_node.clone(),
                                    success: true,
                                }),
                                state: Box::new(next),
                                fingerprint,
                            });
                        }
                    }
                    None
                }
            };

            if let Some(ended_at) = ended_at {
                paths.push(TraversalPath {
                    steps: steps.clone(),
                    final_node_id: Some(state.current_node.clone()),
                    ended_at: ended_at.into(),
                    state: serialize(&state),
                });
                if paths.len() as f64 >= max_paths {
                    break;
                }
            }
        }
        Ok(paths)
    }
}

enum Frame {
    Enter {
        fingerprint: Fingerprint,
        state: Box<RuntimeState>,
        step: Option<PathStep>,
    },
    Leave(Fingerprint),
}

fn conditions_match(
    state: &RuntimeState,
    conditions: Option<&[Condition]>,
    context: Option<&EnumerationContext>,
) -> bool {
    conditions
        .unwrap_or_default()
        .iter()
        .all(|condition| conditions::evaluate(state, condition, context))
}

fn apply_edge(state: &mut RuntimeState, edge: &EdgeBlueprint) {
    effects::apply_all(state, edge.effects.as_deref().unwrap_or_default());
    if let Some(target) = edge.target.as_deref().filter(|target| !target.is_empty()) {
        effects::navigate_to(state, target);
    }
}

fn serialize(state: &RuntimeState) -> SerializedState {
    SerializedState {
        schema_version: 1,
        current_node_id: Some(state.current_node.clone()),
        history: state.history.clone(),
        variables: state.variable_wire_values().into_iter().collect(),
        flags: state.flag_wire_values().into_iter().collect(),
        visited: state.visited.iter().cloned().map(Some).collect(),
        entity_state: state
            .entity_state
            .as_ref()
            .map(|entity| SerializedEntityState {
                owned: entity.owned.iter().cloned().collect(),
                active: entity.active.iter().cloned().collect(),
                unlocked: entity.unlocked.iter().cloned().collect(),
                resources: entity
                    .resources
                    .iter()
                    .map(|(key, value)| (key.clone(), (*value).into()))
                    .collect(),
                extensions: entity.extensions.clone(),
            }),
        extensions: state.extensions.clone(),
    }
}
