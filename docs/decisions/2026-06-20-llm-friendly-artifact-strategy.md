# Decision: LLM-Friendly Artifact Strategy

**Date:** 2026-06-20

## Status

Accepted

## Why this exists

Our LLM-friendly development pattern — generated [`.fiction-map/metadata.json`](../../apps/literature-rpg/.fiction-map/metadata.json)
plus a rendered, agent-legible [`SEMANTICS.md`](../../apps/literature-rpg/src/SEMANTICS.md) — was
built for **authored graph content** (node types, edge types, conditions, effects, graphs). It
works well there.

Adding cross-language visual frontends (a Bubble Tea TUI in Go, a web UI later, an eventual
SaaS) raised a new question: must *every* framework contract also be "generated," the same way
graphs are? Two failure modes were on the table:

- **Over-applying generation** — building a second metadata extractor for stable, single-author
  framework types is ceremony that adds maintenance with little payoff.
- **Under-applying it** — hand-writing a `Frame`/`Intent` protocol in TypeScript and trusting an
  LLM (or a person) to keep a parallel Go/web copy in sync invites silent **drift**: a diverged
  Go struct compiles fine and fails at runtime.

This document sits on top of:

- [North Star](../NORTH_STAR.md)
- [Headless Engine Direction](2026-05-16-headless-engine-direction.md)
- [Persistence Contract](2026-05-20-persistence-contract.md)
- [SEMANTICS LLM Evaluation](../tasks/2026-05-26-semantics-llm-eval.md)

## Decision

**LLM-friendly development means a single source of truth plus machine-readable, agent-legible
artifacts. Generation is a means to that end, not the goal itself.**

Decide per artifact using this rule. Generate a structured artifact when **either** holds:

1. the content is **per-consumer / authored / dynamic** (an agent must reason about a specific
   project instance), **or**
2. it **crosses a language or process boundary** where divergence fails silently at runtime.

Otherwise — for stable, single-language, in-process framework types — **annotated TypeScript
types + tests** are the standard. Do not build a generator for them.

### Why cross-boundary contracts are generated, not hand-ported

The industry-standard answer to "the same contract across many languages" (Protocol Buffers,
OpenAPI, Smithy, GraphQL SDL) is a **neutral schema as the source of truth from which all
language bindings are generated** — not a code-first type in one language reverse-ported into the
others. Two reasons drove us to adopt this for the `Frame`/`Intent` protocol specifically:

- **Drift cost asymmetry.** Retrofitting a code-first contract into a contract-first one later is
  materially harder than starting contract-first. Since Go, web, and SaaS frontends are all
  planned, we pay that cost once, now.
- **It is *more* LLM-friendly, not less.** Spec-as-source means an agent edits **one** schema and
  regenerates every binding. Relying on an LLM to translate types across files is the exact
  compositional, cross-file task where models drift most. A generated binding cannot drift by
  construction; a hand-ported one silently can.

## Adopt

1. **Authored domain content** (nodes, edges, conditions, effects, graphs) → full extraction:
   `metadata.json` + `SEMANTICS.md`. Unchanged.
2. **Stable, single-language, in-process framework types** → TypeScript types with
   `@description` / `@ai-rule` annotations + tests. No bespoke extractor.
3. **Cross-boundary contracts** (the `Frame`/`Intent` presentation protocol) →
   a **neutral schema as the single source of truth** (lightweight: JSON Schema, or a single
   TypeScript definition that *emits* JSON Schema — full Protobuf/gRPC only if RPC framing is
   later wanted), with **generated bindings** for TypeScript, Go, and web, plus a
   **golden-fixture conformance test** both sides validate against as the safety net.
4. The "answer the question without opening the source file" bar from the
   [SEMANTICS LLM Evaluation](../tasks/2026-05-26-semantics-llm-eval.md) applies to every public
   surface, however it is produced — so the protocol schema is annotated and surfaced to agents.

## Reject

1. **A second metadata extractor for stable framework contracts.** Over-engineering.
2. **Hand-maintained parallel contracts across languages with no conformance check.** Drift trap.
3. **Code-first-then-LLM-port for a cross-language wire contract.** Maximizes the drift the
   evidence says LLMs are worst at.
4. **Treating "generated" as a synonym for "LLM-friendly."** Generation is justified by the rule
   above, not by default.

## Consequences

- The `Frame`/`Intent` protocol work (milestone "M1 Contract") is schema-first: define the
  neutral schema, generate the TypeScript types the presenter/session reducer use, generate Go
  structs for the Bubble Tea client, and pin both with a golden-fixture conformance test.
- The graph-content generator (`fiction-map generate`) is untouched by this decision.
- The "rule of three" / WET guidance still governs ordinary in-language abstractions; it does not
  apply to a deliberately shared cross-language contract (that is one piece of knowledge in three
  places — the canonical single-source-of-truth case).
