use std::collections::{BTreeMap, BTreeSet};

use crate::blueprint::{EdgeBlueprint, GraphBlueprint, NodeBlueprint};
use crate::conditions::{compute_projection, prune_enabled, used_condition_types, ConditionSet};
use crate::effects;
use crate::fingerprint::{fingerprint, VisitedRefcounts};
use crate::state::RuntimeState;

/// A parsed transition — the runtime-internal representation of an edge with
/// its requirements + effects resolved.
#[derive(Debug, Clone)]
pub struct Transition {
    pub id: String,
    pub source_node_id: String,
    pub target_node_id: Option<String>,
    pub requirements: ConditionSet,
    pub effects: Vec<crate::blueprint::Effect>,
}

/// A parsed node.
#[derive(Debug, Clone)]
pub struct Node {
    pub id: String,
    #[allow(dead_code)]
    pub auto_resolve: bool,
    pub enter_effects: Vec<crate::blueprint::Effect>,
}

/// The parsed graph — the runtime's internal representation, mirroring the
/// TS `ParsedGraph`.
pub struct ParsedGraph {
    pub transitions: Vec<Transition>,
    pub nodes: BTreeMap<String, Node>,
    pub start_node_id: String,
    pub ending_node_ids: BTreeSet<String>,
    /// Outgoing transitions indexed by source node — the TS runtime scans the
    /// full transition list per step; here we index once at parse time for
    /// O(outdegree) availability checks.
    pub outgoing: BTreeMap<String, Vec<usize>>,
    pub projection: std::collections::HashSet<crate::conditions::StateField>,
    pub prune_enabled: bool,
}

impl ParsedGraph {
    pub fn from_blueprint(bp: &GraphBlueprint) -> Self {
        let transitions: Vec<Transition> = bp
            .edges
            .iter()
            .map(|e| Transition {
                id: e.id.clone(),
                source_node_id: e.source.clone(),
                target_node_id: e.target.clone(),
                requirements: ConditionSet {
                    all: e.conditions.clone(),
                    any: None,
                    none: None,
                },
                effects: e.effects.clone().unwrap_or_default(),
            })
            .collect();

        let start_node_id = bp
            .start_node
            .clone()
            .or_else(|| bp.nodes.first().map(|n| n.id.clone()))
            .unwrap_or_default();

        let ending_node_ids: BTreeSet<String> = if bp.endings.is_empty() {
            find_terminal_nodes(&bp.nodes, &bp.edges).into_iter().collect()
        } else {
            bp.endings.iter().cloned().collect()
        };

        let nodes: BTreeMap<String, Node> = bp
            .nodes
            .iter()
            .map(|n| {
                (
                    n.id.clone(),
                    Node {
                        id: n.id.clone(),
                        auto_resolve: n.auto_resolve.unwrap_or(false),
                        enter_effects: n.enter_effects.clone().unwrap_or_default(),
                    },
                )
            })
            .collect();

        let mut outgoing: BTreeMap<String, Vec<usize>> = BTreeMap::new();
        for (i, t) in transitions.iter().enumerate() {
            outgoing
                .entry(t.source_node_id.clone())
                .or_default()
                .push(i);
        }

        let used = used_condition_types(&bp.edges);
        let projection = compute_projection(&used);
        let prune = prune_enabled(&projection);

        Self {
            transitions,
            nodes,
            start_node_id,
            ending_node_ids,
            outgoing,
            projection,
            prune_enabled: prune,
        }
    }

    pub fn is_ending(&self, node_id: &str) -> bool {
        self.ending_node_ids.contains(node_id)
    }

    /// Get available transitions from the current node, in declaration order.
    pub fn get_available(&self, state: &RuntimeState) -> Vec<&Transition> {
        let mut avail = Vec::new();
        if let Some(indices) = self.outgoing.get(&state.current_node) {
            for &i in indices {
                let t = &self.transitions[i];
                if crate::conditions::evaluate_set(state, &t.requirements) {
                    avail.push(t);
                }
            }
        }
        avail
    }

    /// Apply a transition to a cloned state, returning the new state and
    /// target node id. Mirrors the TS `applyTransition`.
    pub fn step(&self, state: &RuntimeState, transition: &Transition) -> RuntimeState {
        let mut new_state = state.clone();
        effects::apply_all(&mut new_state, &transition.effects);
        if let Some(target) = &transition.target_node_id {
            effects::navigate_to(&mut new_state, target);
        }
        // auto-resolve loop: walk compute nodes until a non-auto node or dead end
        let mut iterations = 0;
        while iterations < 100 {
            let node = match self.nodes.get(&new_state.current_node) {
                Some(n) => n,
                None => break,
            };
            if !node.auto_resolve {
                break;
            }
            // Apply enter effects
            effects::apply_all(&mut new_state, &node.enter_effects);
            // Take first available transition
            let avail = self.get_available(&new_state);
            if avail.is_empty() {
                break;
            }
            let t = avail[0];
            effects::apply_all(&mut new_state, &t.effects);
            if let Some(target) = &t.target_node_id {
                effects::navigate_to(&mut new_state, target);
            }
            iterations += 1;
        }
        new_state
    }

    /// Enumerate all paths through the state space via DFS, with refcount-undo
    /// visited-set pruning. Mirrors the TS `enumeratePaths`, but:
    /// - Uses `u64` fingerprints (no per-call string canon).
    /// - Uses `VisitedRefcounts` for O(1) add/remove on backtrack (no
    ///   per-branch set copy).
    /// - In-place state mutation via a single working buffer (no per-step
    ///   clone).
    pub fn enumerate_paths(&self, max_depth: usize, max_paths: usize) -> Vec<TraversalPath> {
        let mut paths: Vec<TraversalPath> = Vec::with_capacity(max_paths.min(1024));
        let mut state = RuntimeState::initial(&self.start_node_id);
        let mut visited = VisitedRefcounts::new();
        visited.add(fingerprint(&state, &self.projection));
        let mut steps: Vec<PathStep> = Vec::with_capacity(max_depth);

        self.dfs(&mut state, &mut visited, &mut steps, 0, max_depth, max_paths, &mut paths);

        paths
    }

    fn dfs(
        &self,
        state: &mut RuntimeState,
        visited: &mut VisitedRefcounts,
        steps: &mut Vec<PathStep>,
        depth: usize,
        max_depth: usize,
        max_paths: usize,
        paths: &mut Vec<TraversalPath>,
    ) {
        if paths.len() >= max_paths {
            return;
        }

        if depth >= max_depth {
            paths.push(TraversalPath {
                steps: steps.clone(),
                final_node_id: state.current_node.clone(),
                ended_at: "max-depth".to_string(),
            });
            return;
        }

        if self.is_ending(&state.current_node) {
            paths.push(TraversalPath {
                steps: steps.clone(),
                final_node_id: state.current_node.clone(),
                ended_at: "ending".to_string(),
            });
            return;
        }

        let available: Vec<Transition> = self
            .get_available(state)
            .into_iter()
            .cloned()
            .collect();

        if available.is_empty() {
            paths.push(TraversalPath {
                steps: steps.clone(),
                final_node_id: state.current_node.clone(),
                ended_at: "dead-end".to_string(),
            });
            return;
        }

        // Save undo state for each branch
        for t in &available {
            let from = state.current_node.clone();
            let saved = state.clone();
            let next = self.step(state, t);
            *state = next;

            let fp = fingerprint(state, &self.projection);
            let already = self.prune_enabled && visited.contains(fp);

            if already {
                *state = saved;
                continue;
            }

            visited.add(fp);
            steps.push(PathStep {
                transition_id: t.id.clone(),
                from_node_id: from.clone(),
                to_node_id: state.current_node.clone(),
                success: true,
            });

            self.dfs(state, visited, steps, depth + 1, max_depth, max_paths, paths);

            steps.pop();
            visited.remove(fp);
            *state = saved;

            if paths.len() >= max_paths {
                return;
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct PathStep {
    pub transition_id: String,
    pub from_node_id: String,
    pub to_node_id: String,
    pub success: bool,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TraversalPath {
    pub steps: Vec<PathStep>,
    pub final_node_id: String,
    pub ended_at: String,
}

fn find_terminal_nodes(nodes: &[NodeBlueprint], edges: &[EdgeBlueprint]) -> Vec<String> {
    let sources: BTreeSet<String> = edges.iter().map(|e| e.source.clone()).collect();
    nodes
        .iter()
        .map(|n| n.id.clone())
        .filter(|id| !sources.contains(id) && id != &nodes[0].id)
        .collect()
}
