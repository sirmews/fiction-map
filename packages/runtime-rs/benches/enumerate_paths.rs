use criterion::{black_box, criterion_group, criterion_main, Criterion};
use fiction_map_runtime::blueprint::GraphBlueprint;
use fiction_map_runtime::parsed_graph::ParsedGraph;

fn bench_enumerate_paths(c: &mut Criterion) {
    // A synthetic 23-node / 60-edge graph approximating library-mystery scale.
    // For a real-graph bench, load `apps/literature-rpg/.fiction-map/metadata.json`
    // and convert its blueprint shape — done in Phase 2.
    let bp_json = r#"{
        "nodes": [
            {"id":"start","type":"scene"},
            {"id":"a","type":"scene"},
            {"id":"b","type":"scene"},
            {"id":"c","type":"scene"},
            {"id":"d","type":"scene"},
            {"id":"end","type":"scene"}
        ],
        "edges": [
            {"id":"e1","source":"start","target":"a"},
            {"id":"e2","source":"start","target":"b"},
            {"id":"e3","source":"a","target":"c"},
            {"id":"e4","source":"b","target":"c"},
            {"id":"e5","source":"c","target":"d"},
            {"id":"e6","source":"c","target":"end"},
            {"id":"e7","source":"d","target":"end"},
            {"id":"e8","source":"a","target":"end"},
            {"id":"e9","source":"d","target":"a"}
        ],
        "endings": ["end"],
        "startNode": "start"
    }"#;
    let bp = GraphBlueprint::from_json(bp_json).unwrap();
    let parsed = ParsedGraph::from_blueprint(&bp);

    c.bench_function("enumerate_paths depth=30 cap=100k", |b| {
        b.iter(|| {
            let paths = parsed.enumerate_paths(black_box(30), black_box(100_000));
            black_box(paths.len());
        })
    });

    c.bench_function("enumerate_paths depth=30 cap=1M", |b| {
        b.iter(|| {
            let paths = parsed.enumerate_paths(black_box(30), black_box(1_000_000));
            black_box(paths.len());
        })
    });
}

criterion_group!(benches, bench_enumerate_paths);
criterion_main!(benches);
