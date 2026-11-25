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
use crate::traversal::{
    AUTOMATIC_LOOP_CODE, PathEnding, PathHost, automatic_loop_message, enumerate, finish_transition,
};
use crate::validation::terminal_nodes;

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
            None => terminal_nodes(
                blueprint.nodes.iter().map(|node| node.id.as_str()),
                outgoing.keys().copied(),
                first_node,
            )
            .into_iter()
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
        finish_transition(
            state,
            |state| {
                let Some(trigger) = triggers.iter().find(|trigger| {
                    !fired.contains(&trigger.id)
                        && conditions_match(state, Some(&trigger.conditions), context)
                }) else {
                    return Ok(false);
                };
                fired.insert(&trigger.id);
                effects::apply_all(state, &trigger.effects);
                Ok(true)
            },
            |state, at_limit| {
                let Some(node) = self.nodes.get(state.current_node.as_str()) else {
                    return Ok(false);
                };
                if !node.auto_resolve.unwrap_or(false) {
                    return Ok(false);
                }
                if at_limit {
                    return Err(EnumerationError {
                        code: AUTOMATIC_LOOP_CODE.into(),
                        message: automatic_loop_message(&state.current_node),
                    });
                }
                effects::apply_all(state, node.enter_effects.as_deref().unwrap_or_default());
                let Some(next_edge) = self.available(state, context).next() else {
                    return Ok(false);
                };
                apply_edge(state, next_edge);
                Ok(true)
            },
        )
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

        let host = NativePathHost {
            graph: self,
            context,
            triggers,
            visit_checks: visit_checks(self.blueprint, triggers),
        };
        enumerate(&host, RuntimeState::initial(start), max_depth, max_paths)
    }
}

struct NativePathHost<'a> {
    graph: &'a ParsedGraph<'a>,
    context: Option<&'a EnumerationContext>,
    triggers: &'a [StateTrigger],
    visit_checks: Vec<&'a str>,
}

impl<'a> PathHost for NativePathHost<'a> {
    type State = RuntimeState;
    type Transition = &'a EdgeBlueprint;
    type PathStep = PathStep;
    type Path = TraversalPath;
    type Fingerprint = Fingerprint;
    type Error = EnumerationError;

    fn fingerprint(&self, state: &Self::State) -> Result<Self::Fingerprint, Self::Error> {
        Fingerprint::of(state, &self.visit_checks)
    }

    fn ending(&self, state: &Self::State) -> Result<bool, Self::Error> {
        Ok(self.graph.endings.contains(state.current_node.as_str()))
    }

    fn available(&self, state: &Self::State) -> Result<Vec<Self::Transition>, Self::Error> {
        Ok(self.graph.available(state, self.context).collect())
    }

    fn take(
        &self,
        state: &Self::State,
        edge: &Self::Transition,
    ) -> Result<Option<(Self::State, Self::PathStep)>, Self::Error> {
        let next = self.graph.step(state, edge, self.context, self.triggers)?;
        let step = PathStep {
            transition_id: edge.id.clone(),
            from_node_id: state.current_node.clone(),
            to_node_id: next.current_node.clone(),
            success: true,
        };
        Ok(Some((next, step)))
    }

    fn path(
        &self,
        state: &Self::State,
        steps: &[Self::PathStep],
        ending: PathEnding,
    ) -> Result<Self::Path, Self::Error> {
        Ok(TraversalPath {
            steps: steps.to_vec(),
            final_node_id: Some(state.current_node.clone()),
            ended_at: ending.as_str().into(),
            state: serialize(state),
        })
    }
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
