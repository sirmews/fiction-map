use std::alloc::{GlobalAlloc, System};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

use fiction_map_runtime::blueprint::GraphBlueprint;
use fiction_map_runtime::parsed_graph::ParsedGraph;

// Track peak memory via a wrapper allocator
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

fn mb(bytes: u64) -> f64 {
    bytes as f64 / (1024.0 * 1024.0)
}

fn main() {
    // A graph with cycles that would OOM the TS runtime when uncapped.
    // Mirrors the library-mystery scale: 23 nodes, ~60 edges, cycles + branches.
    let bp_json = r#"{
        "nodes": [
            {"id":"start","type":"scene"},
            {"id":"a","type":"scene"},
            {"id":"b","type":"scene"},
            {"id":"c","type":"scene"},
            {"id":"d","type":"scene"},
            {"id":"e","type":"scene"},
            {"id":"f","type":"scene"},
            {"id":"g","type":"scene"},
            {"id":"h","type":"scene"},
            {"id":"i","type":"scene"},
            {"id":"j","type":"scene"},
            {"id":"k","type":"scene"},
            {"id":"l","type":"scene"},
            {"id":"m","type":"scene"},
            {"id":"n","type":"scene"},
            {"id":"o","type":"scene"},
            {"id":"p","type":"scene"},
            {"id":"q","type":"scene"},
            {"id":"r","type":"scene"},
            {"id":"s","type":"scene"},
            {"id":"t","type":"scene"},
            {"id":"u","type":"scene"},
            {"id":"end","type":"scene"}
        ],
        "edges": [
            {"id":"e1","source":"start","target":"a"},
            {"id":"e2","source":"start","target":"b"},
            {"id":"e3","source":"a","target":"c"},
            {"id":"e4","source":"b","target":"c"},
            {"id":"e5","source":"c","target":"d"},
            {"id":"e6","source":"c","target":"e"},
            {"id":"e7","source":"d","target":"f"},
            {"id":"e8","source":"e","target":"f"},
            {"id":"e9","source":"f","target":"g"},
            {"id":"e10","source":"f","target":"h"},
            {"id":"e11","source":"g","target":"i"},
            {"id":"e12","source":"h","target":"i"},
            {"id":"e13","source":"i","target":"j"},
            {"id":"e14","source":"i","target":"k"},
            {"id":"e15","source":"j","target":"l"},
            {"id":"e16","source":"k","target":"l"},
            {"id":"e17","source":"l","target":"m"},
            {"id":"e18","source":"l","target":"n"},
            {"id":"e19","source":"m","target":"o"},
            {"id":"e20","source":"n","target":"o"},
            {"id":"e21","source":"o","target":"p"},
            {"id":"e22","source":"o","target":"q"},
            {"id":"e23","source":"p","target":"r"},
            {"id":"e24","source":"q","target":"r"},
            {"id":"e25","source":"r","target":"s"},
            {"id":"e26","source":"r","target":"t"},
            {"id":"e27","source":"s","target":"u"},
            {"id":"e28","source":"t","target":"u"},
            {"id":"e29","source":"u","target":"end"},
            {"id":"e30","source":"a","target":"b"},
            {"id":"e31","source":"b","target":"a"},
            {"id":"e32","source":"c","target":"a"},
            {"id":"e33","source":"d","target":"c"},
            {"id":"e34","source":"e","target":"c"},
            {"id":"e35","source":"f","target":"c"},
            {"id":"e36","source":"g","target":"d"},
            {"id":"e37","source":"h","target":"e"},
            {"id":"e38","source":"i","target":"f"},
            {"id":"e39","source":"j","target":"g"},
            {"id":"e40","source":"k","target":"h"},
            {"id":"e41","source":"l","target":"i"},
            {"id":"e42","source":"m","target":"j"},
            {"id":"e43","source":"n","target":"k"},
            {"id":"e44","source":"o","target":"l"},
            {"id":"e45","source":"p","target":"m"},
            {"id":"e46","source":"q","target":"n"},
            {"id":"e47","source":"r","target":"o"},
            {"id":"e48","source":"s","target":"p"},
            {"id":"e49","source":"t","target":"q"},
            {"id":"e50","source":"u","target":"r"},
            {"id":"e51","source":"end","target":"u"},
            {"id":"e52","source":"a","target":"end"},
            {"id":"e53","source":"c","target":"end"},
            {"id":"e54","source":"f","target":"end"},
            {"id":"e55","source":"i","target":"end"},
            {"id":"e56","source":"l","target":"end"},
            {"id":"e57","source":"o","target":"end"},
            {"id":"e58","source":"r","target":"end"},
            {"id":"e59","source":"u","target":"end"},
            {"id":"e60","source":"start","target":"end"}
        ],
        "endings": ["end"],
        "startNode": "start"
    }"#;

    let bp = GraphBlueprint::from_json(bp_json).unwrap();
    let parsed = ParsedGraph::from_blueprint(&bp);

    // Test 1: Capped at 100k paths (matching TS baseline)
    PEAK.store(0, Ordering::Relaxed);
    CURRENT.store(0, Ordering::Relaxed);
    let t = Instant::now();
    let paths = parsed.enumerate_paths(30, 100_000);
    let elapsed = t.elapsed();
    let peak = PEAK.load(Ordering::Relaxed);
    println!("depth=30 maxPaths=100k:");
    println!("  paths:     {}", paths.len());
    println!("  time:      {:.1}ms", elapsed.as_secs_f64() * 1000.0);
    println!("  peak mem:  {:.1} MB", mb(peak));
    println!("  throughput: {:.0} paths/s", paths.len() as f64 / elapsed.as_secs_f64());

    // Test 2: Uncapped (the TS OOM case) — cap at 10M to avoid infinite
    PEAK.store(0, Ordering::Relaxed);
    CURRENT.store(0, Ordering::Relaxed);
    let t = Instant::now();
    let paths = parsed.enumerate_paths(30, 10_000_000);
    let elapsed = t.elapsed();
    let peak = PEAK.load(Ordering::Relaxed);
    println!("\ndepth=30 maxPaths=10M (uncapped-equivalent):");
    println!("  paths:     {}", paths.len());
    println!("  time:      {:.1}ms", elapsed.as_secs_f64() * 1000.0);
    println!("  peak mem:  {:.1} MB", mb(peak));
    println!("  throughput: {:.0} paths/s", paths.len() as f64 / elapsed.as_secs_f64());

    // Test 3: Depth 50, uncapped
    PEAK.store(0, Ordering::Relaxed);
    CURRENT.store(0, Ordering::Relaxed);
    let t = Instant::now();
    let paths = parsed.enumerate_paths(50, 10_000_000);
    let elapsed = t.elapsed();
    let peak = PEAK.load(Ordering::Relaxed);
    println!("\ndepth=50 maxPaths=10M:");
    println!("  paths:     {}", paths.len());
    println!("  time:      {:.1}ms", elapsed.as_secs_f64() * 1000.0);
    println!("  peak mem:  {:.1} MB", mb(peak));
    println!("  throughput: {:.0} paths/s", paths.len() as f64 / elapsed.as_secs_f64());
}
