use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone, Copy)]
pub struct TransitionEndpoints<'a> {
    pub id: &'a str,
    pub source: &'a str,
    pub target: Option<&'a str>,
    pub failure_target: Option<&'a str>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct GraphDiagnostic<'a> {
    pub kind: &'static str,
    pub message: String,
    pub node_id: Option<&'a str>,
    pub transition_id: Option<&'a str>,
}

#[derive(Debug, PartialEq, Eq)]
pub struct GraphValidation<'a> {
    pub errors: Vec<GraphDiagnostic<'a>>,
    pub reachable_nodes: Vec<&'a str>,
}

impl GraphValidation<'_> {
    pub fn valid(&self) -> bool {
        self.errors.is_empty()
    }
}

pub(crate) fn terminal_nodes<'a>(
    nodes: impl IntoIterator<Item = &'a str>,
    sources: impl IntoIterator<Item = &'a str>,
    excluded: Option<&str>,
) -> Vec<&'a str> {
    let sources: HashSet<_> = sources.into_iter().collect();
    nodes
        .into_iter()
        .filter(|node| Some(*node) != excluded && !sources.contains(node))
        .collect()
}

/// Validate endpoints in transition order, followed by unreachable and orphan
/// nodes in declaration order. Reachability includes both success and failure
/// routes, matching the existing GraphRuntime contract.
pub fn validate_graph<'a>(
    node_ids: &[&'a str],
    transitions: &[TransitionEndpoints<'a>],
    start: Option<&'a str>,
) -> GraphValidation<'a> {
    let mut result = GraphValidation {
        errors: Vec::new(),
        reachable_nodes: Vec::new(),
    };

    if node_ids.is_empty() {
        result.errors.push(GraphDiagnostic {
            kind: "empty-graph",
            message: "Graph is empty".into(),
            node_id: None,
            transition_id: None,
        });
        return result;
    }

    let nodes: HashSet<_> = node_ids.iter().copied().collect();
    let Some(start) = start.filter(|candidate| nodes.contains(candidate)) else {
        let display_start = start.unwrap_or("undefined");
        result.errors.push(GraphDiagnostic {
            kind: "missing-start-node",
            message: format!("Start node '{display_start}' does not exist in graph"),
            node_id: start,
            transition_id: None,
        });
        return result;
    };

    let mut outgoing: HashMap<_, Vec<_>> = HashMap::new();
    let mut incoming = HashSet::new();
    for transition in transitions {
        let targets = [transition.target, transition.failure_target];
        outgoing
            .entry(transition.source)
            .or_default()
            .extend(targets.into_iter().flatten());
        incoming.extend(targets.into_iter().flatten().filter(|id| !id.is_empty()));
        result
            .errors
            .extend(dangling_diagnostics(transition, &nodes));
    }

    let mut reachable = HashSet::from([start]);
    let mut pending = VecDeque::from([start]);
    while let Some(current) = pending.pop_front() {
        result.reachable_nodes.push(current);
        for &target in outgoing.get(current).into_iter().flatten() {
            if reachable.insert(target) {
                pending.push_back(target);
            }
        }
    }

    for &node_id in node_ids {
        if !reachable.contains(node_id) {
            result.errors.push(GraphDiagnostic {
                kind: "unreachable-node",
                message: format!("Node '{node_id}' is not reachable from start node '{start}'"),
                node_id: Some(node_id),
                transition_id: None,
            });
        }
    }
    for &node_id in node_ids {
        if node_id != start && !incoming.contains(node_id) && !outgoing.contains_key(node_id) {
            result.errors.push(GraphDiagnostic {
                kind: "orphan-node",
                message: format!("Node '{node_id}' has no incoming or outgoing transitions"),
                node_id: Some(node_id),
                transition_id: None,
            });
        }
    }

    result
}

pub fn has_dangling_transitions(
    transitions: &[TransitionEndpoints<'_>],
    node_ids: &[&str],
) -> bool {
    let nodes: HashSet<_> = node_ids.iter().copied().collect();
    transitions.iter().any(|edge| {
        missing_endpoints(edge, &nodes)
            .into_iter()
            .any(|missing| missing)
    })
}

fn missing_endpoints(edge: &TransitionEndpoints<'_>, nodes: &HashSet<&str>) -> [bool; 3] {
    [
        !nodes.contains(edge.source),
        edge.target
            .is_some_and(|node| !node.is_empty() && !nodes.contains(node)),
        edge.failure_target
            .is_some_and(|node| !node.is_empty() && !nodes.contains(node)),
    ]
}

fn dangling_diagnostics<'a>(
    edge: &TransitionEndpoints<'a>,
    nodes: &HashSet<&str>,
) -> Vec<GraphDiagnostic<'a>> {
    let [source, target, failure] = missing_endpoints(edge, nodes);
    let mut diagnostics = Vec::new();
    let id = edge.id;
    let mut push = |node_id, message| {
        diagnostics.push(GraphDiagnostic {
            kind: "dangling-transition",
            message,
            node_id,
            transition_id: Some(id),
        });
    };
    if source {
        push(
            None,
            format!(
                "Transition '{id}' has non-existent source node '{}'",
                edge.source
            ),
        );
    }
    if target && let Some(target) = edge.target {
        push(
            Some(target),
            format!("Transition '{id}' points to non-existent node '{target}'"),
        );
    }
    if failure && let Some(target) = edge.failure_target {
        push(
            Some(target),
            format!(
                "Transition '{id}' has failure target pointing to non-existent node '{target}'"
            ),
        );
    }
    diagnostics
}

#[cfg(test)]
mod tests {
    use super::{TransitionEndpoints, has_dangling_transitions, validate_graph};

    #[test]
    fn preserves_endpoint_diagnostic_order_and_breadth_first_reachability() {
        let nodes = ["start", "isolated", "ending", "failure"];
        let edges = [
            TransitionEndpoints {
                id: "first",
                source: "start",
                target: Some("missing"),
                failure_target: Some("failure"),
            },
            TransitionEndpoints {
                id: "next",
                source: "missing",
                target: Some("ending"),
                failure_target: Some("lost"),
            },
        ];

        let result = validate_graph(&nodes, &edges, Some("start"));
        assert!(!result.valid());
        assert!(has_dangling_transitions(&edges, &nodes));
        assert_eq!(
            result.reachable_nodes,
            ["start", "missing", "failure", "ending", "lost"]
        );
        let codes: Vec<_> = result
            .errors
            .iter()
            .map(|error| (error.kind, error.node_id))
            .collect();
        assert_eq!(
            codes,
            [
                ("dangling-transition", Some("missing")),
                ("dangling-transition", None),
                ("dangling-transition", Some("lost")),
                ("unreachable-node", Some("isolated")),
                ("orphan-node", Some("isolated")),
            ]
        );
    }

    #[test]
    fn handles_empty_graphs_and_absent_start_without_traversing_edges() {
        let empty = validate_graph(&[], &[], None);
        assert_eq!(empty.errors[0].kind, "empty-graph");
        let missing = validate_graph(&["other"], &[], None);
        assert_eq!(
            missing.errors[0].message,
            "Start node 'undefined' does not exist in graph"
        );
        assert!(missing.reachable_nodes.is_empty());
    }
}
