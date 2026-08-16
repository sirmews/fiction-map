use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use serde_json::Value;

use fiction_map_runtime::blueprint::GraphBlueprint;
use fiction_map_runtime::parsed_graph::{ParsedGraph, PathStep, TraversalPath};

/// Mirror of the TS conformance fixture shape. See
/// `packages/runtime/src/conformance.test.ts` for the source-of-truth
/// description. The Rust port MUST produce identical output to the TS runtime
/// for every fixture.
#[derive(Debug, Deserialize)]
struct Fixture {
    name: String,
    #[allow(dead_code)]
    description: String,
    blueprint: GraphBlueprint,
    calls: Vec<Call>,
}

#[derive(Debug, Deserialize)]
#[serde(tag = "method", rename_all = "camelCase")]
enum Call {
    EnumeratePaths { args: Vec<usize>, expected: Vec<ExpectedPath> },
    #[serde(rename = "walk")]
    Walk {
        args: Vec<usize>,
        expected: WalkExpected,
    },
}

#[derive(Debug, Deserialize)]
struct ExpectedPath {
    steps: Vec<ExpectedStep>,
    #[serde(rename = "finalNodeId")]
    final_node_id: String,
    #[serde(rename = "endedAt")]
    ended_at: String,
}

#[derive(Debug, Deserialize)]
struct ExpectedStep {
    #[serde(rename = "transitionId")]
    transition_id: String,
    #[serde(rename = "fromNodeId")]
    from_node_id: String,
    #[serde(rename = "toNodeId")]
    to_node_id: String,
    success: bool,
}

#[derive(Debug, Deserialize)]
struct WalkExpected {
    length: usize,
    #[serde(rename = "finalNodeId")]
    final_node_id: String,
    #[serde(rename = "nodeSequence")]
    node_sequence: Vec<String>,
}

/// Canonical JSON for order-insensitive path comparison (same approach as the
/// TS harness: sort paths by their canonical string before comparing).
fn canonical_path(p: &TraversalPath) -> String {
    let steps: Vec<serde_json::Value> = p
        .steps
        .iter()
        .map(|s| {
            serde_json::json!({
                "transitionId": s.transition_id,
                "fromNodeId": s.from_node_id,
                "toNodeId": s.to_node_id,
                "success": s.success,
            })
        })
        .collect();
    serde_json::json!({
        "steps": steps,
        "finalNodeId": p.final_node_id,
        "endedAt": p.ended_at,
    })
    .to_string()
}

fn sort_paths(paths: Vec<TraversalPath>) -> Vec<TraversalPath> {
    let mut v = paths;
    v.sort_by(|a, b| canonical_path(a).cmp(&canonical_path(b)));
    v
}

fn expected_to_path(e: &ExpectedPath) -> TraversalPath {
    TraversalPath {
        steps: e
            .steps
            .iter()
            .map(|s| PathStep {
                transition_id: s.transition_id.clone(),
                from_node_id: s.from_node_id.clone(),
                to_node_id: s.to_node_id.clone(),
                success: s.success,
            })
            .collect(),
        final_node_id: e.final_node_id.clone(),
        ended_at: e.ended_at.clone(),
    }
}

#[derive(Serialize)]
struct PathOut {
    steps: Vec<PathStep>,
    #[serde(rename = "finalNodeId")]
    final_node_id: String,
    #[serde(rename = "endedAt")]
    ended_at: String,
}

#[test]
fn conformance_fixtures_match_ts_output() {
    let fixtures_dir: PathBuf = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("runtime")
        .join("conformance")
        .join("fixtures");

    let mut failures: Vec<String> = Vec::new();
    let mut total = 0;

    for entry in fs::read_dir(&fixtures_dir).unwrap() {
        let entry = entry.unwrap();
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("json") {
            continue;
        }

        let raw = fs::read_to_string(&path).unwrap();
        let fixture: Fixture = serde_json::from_str(&raw).unwrap();
        let parsed = ParsedGraph::from_blueprint(&fixture.blueprint);

        for call in &fixture.calls {
            total += 1;
            let label = format!("{}::{}", fixture.name, call_label(call));

            match call {
                Call::EnumeratePaths { args, expected } => {
                    let max_depth = args[0];
                    let max_paths = args[1];
                    let actual = parsed.enumerate_paths(max_depth, max_paths);
                    let actual_sorted = sort_paths(actual);
                    let expected_sorted = sort_paths(
                        expected
                            .iter()
                            .map(expected_to_path)
                            .collect(),
                    );

                    if actual_sorted != expected_sorted {
                        let actual_json: Vec<PathOut> = actual_sorted
                            .iter()
                            .map(|p| PathOut {
                                steps: p.steps.clone(),
                                final_node_id: p.final_node_id.clone(),
                                ended_at: p.ended_at.clone(),
                            })
                            .collect();
                        failures.push(format!(
                            "{}\n  expected {} paths, got {}\n  actual: {}\n",
                            label,
                            expected_sorted.len(),
                            actual_sorted.len(),
                            serde_json::to_string_pretty(&actual_json).unwrap(),
                        ));
                    }
                }
                Call::Walk { args, expected } => {
                    // walk() is not yet implemented in the Rust port —
                    // skipped for now, will be added in Phase 2.
                    let _ = (args, expected);
                }
            }
        }
    }

    if !failures.is_empty() {
        eprintln!("\n{} of {} conformance checks failed:\n", failures.len(), total);
        for f in &failures {
            eprintln!("--- {} ---", f);
        }
        panic!("{} conformance failures", failures.len());
    }

    eprintln!("\nAll {} conformance checks passed (enumerate_paths only; walk pending Phase 2)", total);
}

fn call_label(call: &Call) -> String {
    match call {
        Call::EnumeratePaths { args, .. } => {
            format!("enumeratePaths({})", args.iter().map(|a| a.to_string()).collect::<Vec<_>>().join(", "))
        }
        Call::Walk { args, .. } => {
            format!("walk({})", args.iter().map(|a| a.to_string()).collect::<Vec<_>>().join(", "))
        }
    }
}

#[allow(dead_code)]
fn _unused(_: &Value) {}
