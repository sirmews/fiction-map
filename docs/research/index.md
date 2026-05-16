# Research Index

External research and reference materials for Fiction Map.

These files are exploratory and historical. They are not the canonical package contract.
For the current product boundary, use:

- [README.md](../../README.md)
- [docs/NORTH_STAR.md](../NORTH_STAR.md)
- [docs/decisions/2026-05-16-headless-engine-direction.md](../decisions/2026-05-16-headless-engine-direction.md)

## Encore

| File | Description |
|------|-------------|
| [summary.md](encore/summary.md) | Summarized findings from DeepWiki research |
| [user-experience.md](encore/user-experience.md) | Dashboard, visualization, graph representation, TraceNode pattern |
| [deepwiki-raw.md](encore/deepwiki-raw.md) | Full raw output from DeepWiki (330KB) |

**Key Takeaways:**
- Import tracking over decorators for resource discovery
- SWC parser (Rust) for TypeScript AST analysis
- Protocol Buffer metadata for schema definitions
- Built-in `encore check` for static analysis (no external lint)
- Handlebars templates for code generation
- **Graph as primary artifact** — not retrofitted
- **TraceNode pattern** — each node has location + type + context
- **Explicit relationship tracking** — packages track what they call, topics track publishers/subscribers

## Adjacent Platforms and Packages

Research on comparable engines, authoring platforms, and explicitly excluded visual libraries.

| File | Description |
|------|-------------|
| [adjacent-platforms/README.md](adjacent-platforms/README.md) | Index and comparison matrix |
| [adjacent-platforms/ink-inky.md](adjacent-platforms/ink-inky.md) | ink as a headless narrative engine plus authoring app |
| [adjacent-platforms/yarn-spinner.md](adjacent-platforms/yarn-spinner.md) | Yarn Spinner as a reusable runtime plus host bridge |
| [adjacent-platforms/twine.md](adjacent-platforms/twine.md) | Twine as a contrast case for product/runtime coupling |
| [adjacent-platforms/arcweave.md](adjacent-platforms/arcweave.md) | Arcweave as a consumer-app/product reference |
| [adjacent-platforms/articy-draft.md](adjacent-platforms/articy-draft.md) | articy:draft as a platform/schema/export reference |
| [adjacent-platforms/xstate-stately.md](adjacent-platforms/xstate-stately.md) | XState/Stately as a package-boundary reference |
| [adjacent-platforms/visual-libraries-out-of-scope.md](adjacent-platforms/visual-libraries-out-of-scope.md) | Why React Flow, Rete, JointJS, and GoJS are not target models for Fiction Map |

## Tale Weaver Stats

Reference implementation extracted into Fiction Map packages.

| File | Description |
|------|-------------|
| [01-core-graph-model.md](tale-weaver/01-core-graph-model.md) | Three primitives (Node/Edge/Annotation), facets, registry |
| [02-story-model.md](tale-weaver/02-story-model.md) | Story container, scenes, choices, conditions, effects |
| [03-character-system.md](tale-weaver/03-character-system.md) | Character template, primitives (stats/resources/inventory/traits) |
| [04-world-model.md](tale-weaver/04-world-model.md) | World entities, relationships, scene references |
| [05-quest-system.md](tale-weaver/05-quest-system.md) | QuestState, stages, conditions, effects |
| [06-static-publisher.md](tale-weaver/06-static-publisher.md) | Bundle generation, module selection, runtime |
| [07-ui-components.md](tale-weaver/07-ui-components.md) | StoryDisplay, ChoicePanel, CharacterPanel, graph editor |
| [08-llm-guardrails-generator-patterns.md](tale-weaver/08-llm-guardrails-generator-patterns.md) | Generator infrastructure, AST-grep rules (67 rules), Zod contracts |
| [tale-weaver-story-components-review.md](tale-weaver/tale-weaver-story-components-review.md) | Overview document linking to split files |

**Key Takeaways:**
- File conventions (`*.node-type.ts`, `*.edge-type.ts`) for type discovery
- 67 AST-grep rules enforcing deterministic patterns
- Zod schemas for runtime validation
- Generators auto-discover types from file conventions
- `@description` and `@ai-rule` JSDoc annotations for LLM context
