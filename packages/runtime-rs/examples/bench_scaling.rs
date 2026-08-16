use std::time::Instant;
use std::alloc::{GlobalAlloc, System};
use std::sync::atomic::{AtomicU64, Ordering};

use fiction_map_runtime::blueprint::{GraphBlueprint, NodeBlueprint, EdgeBlueprint};

struct TrackingAllocator;
static PEAK: AtomicU64 = AtomicU64::new(0);
static CURRENT: AtomicU64 = AtomicU64::new(0);

unsafe impl GlobalAlloc for TrackingAllocator {
    unsafe fn alloc(&self, layout: std::alloc::Layout) -> *mut u8 {
        let size = layout.size() as u64;
        let cur = CURRENT.fetch_add(size, Ordering::Relaxed) + size;
        let mut peak = PEAK.load(Ordering::Relaxed);
        while cur > peak {
            match PEAK.compare_exchange(peak, cur, Ordering::Relaxed, Ordering::Relaxed) {
                Ok(_) => break,
                Err(prev) => peak = prev,
            }
        }
        unsafe { System.alloc(layout) }
    }
    unsafe fn dealloc(&self, ptr: *mut u8, layout: std::alloc::Layout) {
        CURRENT.fetch_sub(layout.size() as u64, Ordering::Relaxed);
        unsafe { System.dealloc(ptr, layout) }
    }
}

#[global_allocator]
static ALLOC: TrackingAllocator = TrackingAllocator;

fn mb(bytes: u64) -> f64 { bytes as f64 / (1024.0 * 1024.0) }

fn build_cyclic_graph(n: usize, branch: usize) -> GraphBlueprint {
    let nodes: Vec<NodeBlueprint> = (0..n).map(|i| NodeBlueprint {
        id: format!("n{}", i),
        r#type: Some("scene".to_string()),
        auto_resolve: None,
        enter_effects: None,
    }).collect();

    let mut edges: Vec<EdgeBlueprint> = Vec::new();
    let mut idx = 0;
    for i in 0..n {
        for b in 0..branch {
            // Mix of forward and back edges to create cycles
            let target = if b % 3 == 0 && i > 0 {
                (i + n - 1 - (b % 3)) % n  // back edge
            } else {
                (i + 1 + b) % n  // forward edge
            };
            edges.push(EdgeBlueprint {
                id: format!("e{}", idx),
                source: format!("n{}", i),
                target: Some(format!("n{}", target)),
                conditions: None,
                visibility: None,
                effects: None,
                failure_effects: None,
                failure_target: None,
            });
            idx += 1;
        }
    }

    GraphBlueprint {
        nodes,
        edges,
        endings: vec![format!("n{}", n - 1)],
        start_node: Some(format!("n{}", 0)),
    }
}

fn main() {
    // Scale up: 100 nodes, branch=3, lots of cycles
    for &(nodes, branch, depth) in &[(50usize, 2usize, 30usize), (100, 3, 30), (200, 4, 30), (500, 5, 20)] {
        let bp = build_cyclic_graph(nodes, branch);
        let parsed = fiction_map_runtime::parsed_graph::ParsedGraph::from_blueprint(&bp);

        PEAK.store(0, Ordering::Relaxed);
        CURRENT.store(0, Ordering::Relaxed);
        let t = Instant::now();
        let paths = parsed.enumerate_paths(depth, 10_000_000);
        let elapsed = t.elapsed();
        let peak = PEAK.load(Ordering::Relaxed);

        println!(
            "nodes={:>4} branch={} depth={:>2}: paths={:>8} time={:>8.1}ms peak_mem={:>6.1}MB throughput={:>10.0} p/s",
            nodes, branch, depth, paths.len(),
            elapsed.as_secs_f64() * 1000.0,
            mb(peak),
            paths.len() as f64 / elapsed.as_secs_f64(),
        );
    }
}
