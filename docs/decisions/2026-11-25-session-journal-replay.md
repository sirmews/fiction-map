# Decision: Session Journal for Deterministic Replay

Date: 2026-11-25

## Status

Proposed

## Why this exists

Fiction Map is being built as a game engine for complex branching story systems. Plugins —
consumer-registered condition evaluators and effect handlers — may call LLMs and other
non-deterministic systems. Once a plugin influences a session, "what happened" is
unrecoverable: the session cannot be replayed, debugged, saved mid-flight, or branched.

The runtime's state model is already immutable and traceable (`TransitionResult` carries a
trace; the design doc anticipated "undo/redo, branching timelines, replay, debugging"). What
is missing is a canonical record of the non-deterministic inputs that produced a session.

## Decision

Introduce the **session journal** as a first-class runtime concept:

- Every plugin invocation is a **capability exchange**: the engine issues a named request and
  receives a response. Capabilities are the only sanctioned source of non-determinism.
- In **record** mode the engine runs live and appends every capability exchange to the
  session's journal. In **replay** mode the engine never invokes plugins; it resolves each
  exchange from the journal.
- Journal entries are keyed by state fingerprint (the existing `fingerprint`/symbolic-state
  machinery) plus request hash, so divergence fails loudly rather than silently drifting.
- Journal metadata pins non-determinism sources: plugin versions, model identifiers,
  sampling parameters, and seeds.
- Plugins may declare purity: pure capabilities (e.g., formula effects) may be re-executed
  during replay; impure ones must be journaled.
- Stochastic-but-deterministic randomness uses seeded RNG rather than journaling.

Vocabulary is defined in [CONTEXT.md](../../CONTEXT.md) (Session, Journal, Record, Replay,
Branch, Capability, Plugin).

## Considered options

- **Record full state snapshots per step.** Rejected as the *only* mechanism: snapshots make
  replay cheap but cannot reconstruct *why* a plugin answered as it did, cannot fork cleanly
  (the journal prefix is the fork point), and grow quadratically with session length.
  Snapshots remain useful as journal checkpoints.
- **Require plugins to be deterministic (seeded LLMs, temp 0).** Rejected: even "deterministic"
  LLM calls are not reproducible across provider versions and hardware; determinism must be
  a property of the *recording*, not the provider.
- **Do nothing; treat sessions as disposable.** Rejected: blocks save/resume, replay
  debugging, alternate timelines, and CI testing of LLM-influenced content — all core to the
  game-engine direction.

## Consequences

- The engine core stays pure: `(state, transition, journaled inputs) → state`. Non-determinism
  lives only at the capability boundary.
- Replay is free of plugin and LLM cost — enabling replay debugging, "what if" branches, and
  recorded-session CI tests.
- Journal entries for LLM calls are large (full prompts/completions); storage needs
  dedup/compression or content-addressed blobs. This is a storage concern, not a semantic one.
- The JSON wire protocol (`path-enumeration.schema.json` and successors) is the natural
  serialization for journals, so the Rust engine, Wasm binding, and engine-as-a-service all
  share one replay format.
- Save format becomes: state snapshot + journal tail.
