# Session Journal — Implementation Plan

**Status:** Draft
**ADR:** [2026-11-25-session-journal-replay](../decisions/2026-11-25-session-journal-replay.md)
**Vocabulary:** [CONTEXT.md](../../CONTEXT.md) — Session, Journal, Record, Replay, Branch, Capability, Plugin

## Goal

Make sessions with plugin-influenced (potentially non-deterministic) content reproducible:
record once, replay forever, branch freely, test in CI without re-calling LLMs.

Non-goals for v1: multiplayer/synced sessions, journal compression, distributed replay
serving. Storage dedup is designed for but not required in v1.

## Current state (what we build on)

- `GraphRuntime` takes `evaluators: Map<string, ConditionEvaluator>` and
  `handlers: Map<string, EffectHandler>` — plugins are already keyed by string type.
  `packages/runtime/src/runtime.ts`
- Built-ins live in `builtinEvaluators`/`builtinHandlers`
  (`default-bindings.ts`); everything else is consumer-registered.
- `StateTrigger`s run condition-gated effects after each step.
- `serializeState`/`deserializeState` already version saves via `schemaVersion`
  (`SERIALIZATION_SCHEMA_VERSION`, `core/state.ts`) — the journal piggybacks on this
  precedent for its own format versioning.
- `SymbolicState.getFingerprint()` exists for cycle pruning; journal entries reuse it
  for divergence detection.
- `walk()` auto-steps; `enumeratePaths()` is bulk analysis. Both route through `step()`.
- PR #103 (Rust cutover) is still draft. This plan is written against `main`'s TypeScript
  runtime; the Rust/wire-protocol implications are called out per section.

## Design

### 1. Journal file format

A journal is a single JSON document (streaming-friendly: JSONL is acceptable if payloads
grow, but v1 is one document — sessions are interactive-scale, not bulk).

```jsonc
{
  "format": "fiction-map/journal",
  "formatVersion": 1,
  "session": {
    "graphId": "literature-rpg/main",
    "graphVersion": "…",          // content hash of the parsed blueprint
    "createdAt": "…",
    "initialState": { /* SerializableState */ }
  },
  "capabilities": {
    // Static manifest: every plugin the session may invoke, with its contract version
    // and re-executability declaration. Recorded once at session start.
    "llm.narrate": {
      "version": "1.2.0",
      "reexecutable": false,       // must be journaled
      "sideEffectFree": false,
      "model": { "provider": "…", "id": "…", "temperature": 0.7, "seed": 42 }
    },
    "math.roll": {
      "version": "1.0.0",
      "reexecutable": true,        // may be re-run during replay
      "sideEffectFree": true
    }
  },
  "entries": [
    {
      "seq": 0,
      "stepIndex": 3,              // which runtime.step() produced this
      "stateFingerprint": "…",     // SymbolicState fingerprint BEFORE the exchange
      "capability": "llm.narrate",
      "requestHash": "sha256:…",   // canonical hash of the request payload
      "request": { /* capability-specific, opaque to engine */ },
      "response": { /* opaque */ },
      "durationMs": 412
    }
  ],
  "choices": [
    // Player/agent decisions that are NOT capability exchanges:
    // which transition was picked at each interactive step.
    { "seq": 0, "stepIndex": 3, "transitionId": "t_…", "stateFingerprint": "…" }
  ],
  "checkpoints": [
    // Optional full-state snapshots at intervals for fast-forward.
    // Format: { "stepIndex": N, "state": SerializableState, "entrySeq": M }
  ]
}
```

Key decisions baked in:

- **Sequential cursor, not hash lookup.** Entries are consumed in `seq` order during
  replay. `stateFingerprint` + `requestHash` are divergence *detectors*: if the replayed
  state fingerprint doesn't match the entry's, replay aborts loudly
  (`ERR_JOURNAL_DIVERGENCE`) instead of silently returning a wrong response.
- **Capabilities manifest is recorded, not assumed.** Replay validates the manifest
  against the plugins actually registered — a version mismatch is an explicit error,
  not silent drift.
- **`choices` are journaled too.** The journal must capture *all* non-determinism
  inputs: plugin responses AND which edge the player picked. Without choices, replay
  can reconstruct state but not the decision path (needed for branching/"what if").
- **`formatVersion` follows the `schemaVersion` precedent**: unknown versions are
  rejected with a migration instruction, never silently coerced.

### 2. Capability interface

Plugins are registered through the existing `evaluators`/`handlers` maps; the journal
adds a parallel **capability declaration** map:

```ts
interface CapabilityDeclaration {
  /** Registered plugin type(s) this capability covers, e.g. "llmNarrate" */
  pluginTypes: string[]
  version: string
  /** May be re-invoked during replay (deterministic + side-effect-free). */
  reexecutable: boolean
  /** No mutation of external systems; safe to call speculatively. */
  sideEffectFree: boolean
  /** Non-determinism source pinning: model id, seed, params. */
  source?: Record<string, unknown>
}
```

- **Built-ins are implicitly `reexecutable: true, sideEffectFree: true`** — the engine
  treats them as pure and never journals them. This keeps journals small for the common
  case (pure graph traversal produces zero entries).
- **Custom plugins default to `reexecutable: false`** — safe default; opting into
  re-execution is an explicit, auditable declaration.
- A capability may cover multiple plugin types (one LLM-backed evaluator and one
  LLM-backed effect handler can share `llm.narrate`).

Registration shape (v1): a `JournalSession` wrapper, not changes to `GraphRuntime`'s
constructor — keeps the pure engine untouched:

```ts
const journal = createJournalSession({
  runtime,                 // GraphRuntime
  mode: "record",          // | "replay" | "live-unrecorded"
  journal,                 // JournalDocument | path | null
  capabilities,            // Map<string, CapabilityDeclaration>
})

journal.step(state, transition, context)   // same signature as runtime.step
journal.getAvailable(state, context)      // journals condition evaluations too
journal.walk(state, context)
journal.serialize()       // → JournalDocument
journal.fork(atSeq)       // → new JournalSession on a prefix
```

### 3. Record / replay plumbing

`GraphRuntime.step()` internals call evaluators/handlers at several points:
`checkTransitionAvailability` (requirements/visibility), `applyTransition` (effects,
enterEffects, failureEffects, triggers). Rather than instrumenting every call site,
v1 wraps the **maps themselves**:

```ts
function journaledEvaluators(
  evaluators: Map<string, ConditionEvaluator>,
  journal: JournalSink,
  state: GraphRuntimeState,
): Map<string, ConditionEvaluator>
```

Each wrapped evaluator, on invocation:

1. Computes `requestHash` over `{ capability, pluginType, args }`.
2. **Record mode:** calls the real evaluator, appends `{seq, stepIndex, stateFingerprint,
   capability, requestHash, request, response}` to the journal, returns response.
3. **Replay mode:** reads the next journal entry for this capability in seq order,
   asserts `stateFingerprint` + `requestHash` match (else `ERR_JOURNAL_DIVERGENCE`),
   returns the recorded response. The real evaluator is never invoked.
4. **Reexecutable capabilities:** replay calls the real evaluator directly (no journal
   read) — but *only* if declared `reexecutable && sideEffectFree`.

`stepIndex` is assigned by the `JournalSession` wrapper around `runtime.step()` /
`walk()` / `getAvailable()`. Evaluations triggered by `getAvailable` (visibility checks)
get their own step indices in a `probe` sub-sequence — they must be journaled too,
because a visibility condition can call an LLM ("is this path narratively allowed?").

Ordering guarantee: within a step, capability invocations happen in a deterministic
order (the engine's evaluation order). The journal relies on this; if evaluation order
becomes nondeterministic (e.g. `Map` iteration), journal seq alignment breaks. v1
assumes the current deterministic order — worth a comment/test asserting it.

### 4. Interaction with walk / enumeratePaths / triggers

- **`walk()`**: runs through `journal.step()` per iteration; `stepIndex` increments.
  Auto-resolved nodes still produce capability exchanges (enterEffects can call plugins).
- **`enumeratePaths()`**: bulk analysis, not a session. v1 decision: enumeration runs
  **live-unrecorded** against whatever evaluators are registered — it is a developer/
  validation tool, not a playthrough. If a consumer needs deterministic enumeration over
  LLM conditions, they replay a recorded session's capability responses as the evaluator
  map (the journal doubles as a stub provider). Document this; don't build a
  journal-backed enumerator in v1.
- **`StateTrigger`s**: trigger conditions/effects go through the same wrapped maps, so
  they're journaled automatically. Trigger firing order is already deterministic
  (insertion order).

### 5. Branching

`journal.fork(atSeq)` returns a new session whose journal is `entries[0..atSeq]` plus a
`forkPoint` marker recording the parent journal's content hash. Divergent play appends
new entries after the fork point. Replays of a fork validate against the *forked*
journal only — a branch never needs the parent's tail.

UI/consumer responsibility: presenting branches. The engine provides `fork()` and
`listBranches()` (derived from `forkPoint` markers); it does not manage branch storage.

### 6. Save format

Per the ADR: **state snapshot + journal tail**.

```ts
interface SessionSave {
  schemaVersion: 1
  state: SerializableState          // existing serializeState() output
  journal: JournalDocument          // full journal, or tail + parent ref for large sessions
  capabilities: Map<string, CapabilityDeclaration>
}
```

`serializeState`/`deserializeState` are unchanged — the journal is a sibling artifact,
not embedded in state. This keeps `GraphRuntimeState` pure and the journal external,
matching CONTEXT.md ("the journal is external to state").

### 7. Rust / wire-protocol implications (PR #103 dependency)

The plan is written against the TS runtime on `main`. When #103 lands:

- **Journal format is language-neutral JSON** — the Rust engine can read/write the same
  document. The capability *manifest* and *entries* are the contract; they should get a
  JSON Schema in `packages/runtime/conformance/` (or a new `journal/` schema dir) with
  generated TS bindings per the AGENTS.md cross-language rule.
- **Replay in Rust:** if the Rust engine owns traversal, replay needs the journal cursor
  inside `runtime-rs`. The wrapped-maps approach doesn't translate — Rust needs a
  first-class `JournalReplayer` that resolves capability requests against entries.
  This is the main #103-coupling risk: **the capability boundary must exist as a Rust
  concept, not just a TS wrapper**, or replay can't run natively.
- **Wasm path:** JS plugins are invoked from Rust via the existing JsValue callback
  mechanism; the journal wrapper can live on the JS side of that boundary (Rust asks JS
  for a capability result; JS wrapper records/replays). This works but keeps the
  per-call boundary cost.
- **Recommendation:** land the TS-side journal first (this plan), use it to validate the
  semantics, then port the journal cursor into `runtime-rs` as part of or immediately
  after #103. Do NOT block #103 on this.

### 8. Storage / large payloads

v1 stores request/response inline. For LLM calls (multi-KB prompts/completions):

- Content-address `request`/`response` blobs: `"request": {"$blob": "sha256:…"}` with a
  sidecar `blobs/` map in the journal document (or a directory alongside it for file
  storage). Identical prompts dedup naturally.
- The engine treats blobs as opaque; only the journal serializer knows the convention.
- Compression is a storage-layer concern (gzip the file); not in the format.

### 9. Error model

| Condition | Error |
|---|---|
| Replay state fingerprint ≠ entry fingerprint | `ERR_JOURNAL_DIVERGENCE` |
| Replay request hash ≠ entry request hash | `ERR_JOURNAL_DIVERGENCE` |
| Journal exhausted mid-replay | `ERR_JOURNAL_EXHAUSTED` (session tried to continue past recorded end — expected for live extension of a replayed session; v1: error, since extending requires switching to record mode) |
| Unknown `formatVersion` | `ERR_JOURNAL_SCHEMA_MISMATCH` |
| Capability manifest version mismatch at replay | `ERR_CAPABILITY_MISMATCH` |
| Plugin invokes capability not in manifest | `ERR_CAPABILITY_UNDECLARED` |

All are `RuntimeError` subclasses consistent with existing error style.

### 10. Testing strategy

- **Unit:** record a scripted session with a fake LLM plugin (deterministic stub that
  returns canned-but-nondeterministic-looking responses), replay it, assert identical
  state trace and zero plugin invocations during replay (spy counter).
- **Divergence:** tamper one journal entry → assert `ERR_JOURNAL_DIVERGENCE`.
- **Branch:** record → fork at seq N → diverge → assert both branches replay cleanly.
- **Conformance:** journal schema JSON fixtures (record output → replay input) in
  `packages/runtime/conformance/` style; generated bindings when the Rust port lands.
- **Literature RPG integration:** record a real session against a stubbed LLM narrator,
  check in the journal as a fixture, replay in CI.

## Rollout

1. **Phase 1 (TS, this plan):** `JournalDocument` types + schema, `createJournalSession`
   wrapper, wrapped evaluator/handler maps, record/replay/fork, unit + integration tests.
   No changes to `GraphRuntime` internals.
2. **Phase 2:** JSON Schema for the journal format + generated bindings; content-addressed
   blob storage; `SessionSave` composition helpers.
3. **Phase 3 (with/after #103):** port journal cursor into `runtime-rs`; Wasm binding
   replay path; engine-as-a-service replay endpoint.
4. **Phase 4:** consumer-facing save UI integration (literature-rpg-web), branch
   management.

## Open questions

- Should `getAvailable()` probing be journaled as first-class entries or a separate
  `probes` array? (Affects seq alignment; lean: same entries array, `kind: "probe"`.)
- Do we need journal GC (drop entries before the last checkpoint)? Probably yes for
  long sessions; defer to Phase 2.
- Can a replayed session switch back to record mode mid-flight ("extend a replay")?
  ADR implies journal tail append; needs a defined merge rule for the boundary entry.
- How are capability requests keyed when the same plugin type is invoked with different
  argument shapes? `requestHash` over canonical JSON — need a canonicalization rule
  (sorted keys) shared across TS/Rust.
