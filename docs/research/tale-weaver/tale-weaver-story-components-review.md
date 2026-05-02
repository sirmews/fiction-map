# Tale Weaver Stats — Story Components & Architecture Review

> **This document has been split.** See split documents in `reviews/tale-weaver/`

---

## Overview

**Tale Weaver Stats** is an interactive RPG story game engine with a visual graph editor, built as a monorepo. It enables authors to create branching narratives ranging from simple linear stories to full RPG adventures with stats, inventory, condition logic, and complex world modeling.

**Core Philosophy:** "Move power out of manual wiring and into clear definitions, derived artifacts, explicit boundaries, and verification." The architecture is explicitly optimized for LLM ergonomics — it should become *easier* to extend correctly over time.

---

## Split Documents

| Document | Coverage |
|----------|----------|
| [`01-core-graph-model.md`](tale-weaver/01-core-graph-model.md) | Three primitives (Node/Edge/Annotation), facets, registry, three-layer architecture |
| [`02-story-model.md`](tale-weaver/02-story-model.md) | Story container, scenes, choices, conditions, effects, inline actions, features |
| [`03-character-system.md`](tale-weaver/03-character-system.md) | Character template, primitives (stats/resources/inventory/traits), GameState, domain functions |
| [`04-world-model.md`](tale-weaver/04-world-model.md) | World entities, relationships, scene references |
| [`05-quest-system.md`](tale-weaver/05-quest-system.md) | QuestState, stages, conditions, effects |
| [`06-static-publisher.md`](tale-weaver/06-static-publisher.md) | Bundle generation, module selection, runtime |
| [`07-ui-components.md`](tale-weaver/07-ui-components.md) | StoryDisplay, ChoicePanel, CharacterPanel, graph editor |
| [`08-llm-guardrails-generator-patterns.md`](tale-weaver/08-llm-guardrails-generator-patterns.md) | Generator infrastructure, AST-grep rules, Zod contracts, capability framework, pure domain functions |

---

## Extracted Packages

| Package | Location | Purpose | Status |
|---------|----------|---------|--------|
| `@your-org/story-runtime` | [`packages/story-runtime/`](../packages/story-runtime/) | Schema-driven runtime engine extracted from Tale Weaver's domain package. Pluggable condition evaluators, effect handlers, transition engine, graph validation. | ✅ 34 tests passing |
| `@your-org/story-graph-flow` | [`packages/story-graph-flow/`](../packages/story-graph-flow/) | React Flow canvas for narrative visualization. Auto-layout, edge validation, node primitives. | ✅ 12 tests passing |

---

## Design Documents

| Document | Purpose |
|----------|---------|
| [`story-runtime-design.md`](story-runtime-design.md) | Design document for the extracted story-runtime package |
| [`story-graph-flow-design.md`](story-graph-flow-design.md) | Design document for the React Flow visualization layer |

---

## Quick Reference: Key Packages

| Package | Path | Purpose |
|---------|------|---------|
| `@tale-weaver/graph-core` | `packages/graph-core/` | Generic node/edge/annotation definitions |
| `@tale-weaver/domain` | `packages/domain/` | Pure domain logic (no I/O) |
| `@tale-weaver/contracts` | `packages/contracts/` | Zod schemas for API contracts |
| `@tale-weaver/frontend-graph` | `packages/frontend-graph/` | Reusable graph UI primitives |
| `@tale-weaver/product-tale-weaver-graph` | `packages/product-tale-weaver-graph/` | Tale Weaver node/edge types |
| `@tale-weaver/product-tale-weaver-ui` | `packages/product-tale-weaver-ui/` | Tale Weaver UI components |
| `@tale-weaver/static-publisher` | `packages/static-publisher/` | Standalone bundle generation |

---

## Key Takeaways (Summary)

1. **Unified Identity Model:** Everything is a node, edge, or annotation. No bespoke tables for every concept.

2. **Pure Domain Logic:** The `@tale-weaver/domain` package has zero I/O — just pure functions for choice validation, state updates, graph validation. Reusable in frontend, backend, and static publisher.

3. **Single-Source Derivation:** Define intent once in a `.node-type.ts` file, derive schemas, validation, UI hints, and capabilities automatically.

4. **Conditional Visibility Everywhere:** Choices, actions, and UI elements all use the same `ConditionSet` system with `all`/`any`/`none` groups.

5. **Extensible Primitives:** The four character primitives (stats, resources, inventory, traits) are intentionally generic. Story creators define their world via the character template.

6. **LLM-Optimized Architecture:** Explicitly designed to become easier for LLMs to extend — clear boundaries, single-source definitions, auto-generated docs (`GRAPH_SEMANTICS.md`), explicit contracts.

7. **Product-Scoped Boundaries:** Unlike global-schema CMSs, each product has its own registry slice. A `journal-entry` does not exist in Tales Stories; a `scene` does not exist in Journal.

8. **Feature-Gated Complexity:** Story styles and enabled features control editor and player complexity. Authors opt into RPG mechanics rather than inheriting them.

9. **Static Publisher:** Stories can be exported as self-contained vanilla-JS bundles (~20-45KB depending on features), playable without the main app.

10. **Runtime State Is Separate:** Canonical nodes define what things ARE; active effects, inventory state, and playthrough progress live in edges or runtime records, not in the canonical content model.

11. **Deterministic LLM Guardrails:** Generator infrastructure, AST-grep rules (67 rules), Zod schema contracts, and capability framework provide Encore-style deterministic patterns for LLM-generated code. See [`08-llm-guardrails-generator-patterns.md`](08-llm-guardrails-generator-patterns.md).