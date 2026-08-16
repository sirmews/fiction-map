use std::collections::HashSet;
use std::hash::{BuildHasherDefault, Hash, Hasher};

use crate::conditions::StateField;
use crate::state::RuntimeState;

/// A state identifier — a `u64` hash of the `RuntimeState`.
///
/// This mirrors Stateright's `Fingerprint = NonZeroU64` approach: a single
/// integer per state, stored in a `HashSet` using `NoHashHasher` so the
/// visited-set never re-hashes the key (zero-cost membership check).
pub type Fingerprint = u64;

/// Compute a stable `Fingerprint` for a `RuntimeState`, restricted to the
/// fields in the projection.
///
/// Only the fields declared in `projection` are hashed — matching the TS
/// `SymbolicState.getFingerprint()` which builds its canonical string from
/// only the projected fields. Two states that differ only in fields outside
/// the projection get the same fingerprint and are pruned as equivalent.
pub fn fingerprint(state: &RuntimeState, projection: &HashSet<StateField>) -> Fingerprint {
    let mut hasher = ahash::AHasher::default();

    if projection.contains(&StateField::CurrentNode) {
        state.current_node.hash(&mut hasher);
    }
    if projection.contains(&StateField::Flags) {
        for (k, v) in &state.flags {
            k.hash(&mut hasher);
            v.to_string().hash(&mut hasher);
        }
    }
    if projection.contains(&StateField::Variables) {
        for (k, v) in &state.variables {
            k.hash(&mut hasher);
            v.to_string().hash(&mut hasher);
        }
    }
    if projection.contains(&StateField::Visited) {
        for n in &state.visited {
            n.hash(&mut hasher);
        }
    }
    if projection.contains(&StateField::History) {
        for n in &state.history {
            n.hash(&mut hasher);
        }
    }
    if let Some(es) = &state.entity_state {
        if projection.contains(&StateField::EntityOwned) {
            for n in &es.owned {
                n.hash(&mut hasher);
            }
        }
        if projection.contains(&StateField::EntityActive) {
            for n in &es.active {
                n.hash(&mut hasher);
            }
        }
        if projection.contains(&StateField::EntityUnlocked) {
            for n in &es.unlocked {
                n.hash(&mut hasher);
            }
        }
        if projection.contains(&StateField::EntityResources) {
            for (k, v) in &es.resources {
                k.hash(&mut hasher);
                v.to_bits().hash(&mut hasher);
            }
        }
    }

    let fp = hasher.finish();
    if fp == 0 { 1 } else { fp }
}

/// A visited-state set keyed by `Fingerprint`, using `NoHashHasher` so the
/// `u64` fingerprint is stored directly without re-hashing.
///
/// This is the Rust analogue of the TS `visitedStateFingerprints: Set<string>`,
/// but with three differences:
/// 1. Keys are `u64`, not canonical strings (no per-call string allocation).
/// 2. The hasher is a no-op (`NoHashHasher`), so membership is a raw compare.
/// 3. For `enumerate_paths` we use a refcount variant (`VisitedRefcounts`) so
///    we can add-on-descend / remove-on-backtrack in O(1) per branch, instead
///    of copying the whole set per branch as the TS runtime does.
pub type VisitedSet = HashSet<Fingerprint, BuildHasherDefault<NoHashHasher>>;

#[derive(Default)]
pub struct NoHashHasher(u64);

impl Hasher for NoHashHasher {
    fn write(&mut self, bytes: &[u8]) {
        for &byte in bytes {
            self.0 = self.0.wrapping_mul(31).wrapping_add(byte as u64);
        }
    }

    fn write_u64(&mut self, i: u64) {
        self.0 = i;
    }

    fn finish(&self) -> u64 {
        self.0
    }
}

/// A refcounted visited set for DFS path enumeration.
///
/// On descend: `add(fp)` → refcount[fp] += 1, mark seen.
/// On backtrack: `remove(fp)` → refcount[fp] -= 1, if zero, evict from seen.
///
/// This replaces the TS runtime's `new Set(visitedStateFingerprints)` per
/// branch (O(visited) copy per transition) with O(1) add/remove. For a
/// 1M-state enumeration this is the difference between fitting in memory and
/// OOM — which is the actual constraint the TS runtime hits.
pub struct VisitedRefcounts {
    seen: VisitedSet,
    counts: ahash::AHashMap<Fingerprint, u32>,
}

impl VisitedRefcounts {
    pub fn new() -> Self {
        Self {
            seen: VisitedSet::default(),
            counts: ahash::AHashMap::new(),
        }
    }

    pub fn add(&mut self, fp: Fingerprint) {
        let c = self.counts.entry(fp).or_insert(0);
        *c += 1;
        if *c == 1 {
            self.seen.insert(fp);
        }
    }

    pub fn remove(&mut self, fp: Fingerprint) {
        if let Some(c) = self.counts.get_mut(&fp) {
            *c -= 1;
            if *c == 0 {
                self.seen.remove(&fp);
            }
        }
    }

    pub fn contains(&self, fp: Fingerprint) -> bool {
        self.seen.contains(&fp)
    }
}

impl Default for VisitedRefcounts {
    fn default() -> Self {
        Self::new()
    }
}
