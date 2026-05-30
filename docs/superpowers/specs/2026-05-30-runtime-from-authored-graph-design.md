# Runtime From Authored Graph Design

## Context

The literature-rpg consumer app currently defines the same graph twice:

- `apps/literature-rpg/src/graphs/story.graph.ts` defines the authored graph for `fiction-map generate`.
- `apps/literature-rpg/src/main.ts` defines a separate `GraphRuntime` blueprint for execution.

That makes the consumer proof weaker than it should be. The generated metadata currently records the `descend` condition, but it does not record the `enter-hall` effect that grants the lantern. A metadata-to-runtime adapter would therefore be incomplete until runtime effects are part of the authored graph definition.

The goal is to make the authored `defineGraph` source the single graph definition for both metadata and runtime execution, without redesigning the runtime API.

## Goals

- Store runtime-relevant edge effects in the authored graph definition.
- Add a small public runtime adapter that converts a core `GraphDefinition` into a runtime `GraphBlueprint`.
- Let consumers create a `GraphRuntime` from a `GraphDefinition` without duplicating nodes and edges.
- Regenerate metadata and `SEMANTICS.md` so the generated artifacts show both conditions and effects.
- Update stale docs and friction notes so the repo reflects the new state.

## Non-Goals

- No broader runtime API redesign.
- No new MCP server or long-running graph service.
- No UI work.
- No new graph authoring DSL.
- No change to the existing `GraphRuntime` constructor behavior.

## Proposed API

Add runtime helpers exported from `@fiction-map/runtime`:

```ts
import type { GraphDefinition } from "@fiction-map/core";

export function graphDefinitionToBlueprint(graph: GraphDefinition): GraphBlueprint;

export function createRuntimeFromGraph(
  graph: GraphDefinition,
  evaluators?: Map<string, ConditionEvaluator>,
  handlers?: Map<string, EffectHandler>
): GraphRuntime;
```

The helper names are intentionally plain. They describe the current boundary: core metadata graph in, runtime graph out.

## Mapping Rules

`graphDefinitionToBlueprint(graph)` maps:

- `graph.nodes[]` to runtime nodes with `id` and `type`.
- `graph.edges[].id`, `source`, and `target` directly to runtime edge fields.
- `graph.edges[].conditions` to runtime `conditions`.
- `graph.edges[].effects` to runtime `effects`.
- `graph.edges[].text` to runtime `label` when `text` is a string.
- remaining custom edge fields into runtime edge `metadata`, excluding fields already consumed by the runtime blueprint.
- `graph.endings` to runtime endings.
- no explicit `startNode` unless a future authored graph field is introduced; runtime keeps today's first-node convention.

This avoids guessing a start-node semantic that the authored graph does not yet expose.

## Consumer App Update

Update `apps/literature-rpg/src/graphs/story.graph.ts` so `enter-hall` includes:

```ts
effects: [{ type: "grantEntity", entityId: "lantern" }]
```

Update `apps/literature-rpg/src/main.ts` so it imports `story` and creates:

```ts
export const runtime = createRuntimeFromGraph(story);
```

The manual `GraphRuntime` blueprint in `main.ts` should be removed.

## Docs Update

Update the friction log:

- mark the two-layer graph duplication item as fixed or materially reduced.
- keep a note that start-node semantics still use first-node convention.
- keep unrelated remaining friction items unchanged.

Update stale public API docs that still claim `GraphBlueprint` is not exported. The current code exports blueprint types, and the new adapter makes those exports intentional rather than accidental.

Regenerate generated artifacts so `apps/literature-rpg/src/SEMANTICS.md` shows `grantEntity` on `enter-hall`.

## Testing

Use TDD for the adapter:

1. Add a failing runtime test proving `graphDefinitionToBlueprint` preserves nodes, edge labels, conditions, effects, endings, and custom edge metadata.
2. Add a failing consumer test or update the existing consumer test so `playOnce()` still reaches `dark-chapter` after `main.ts` stops defining a manual blueprint.
3. Implement the adapter and consumer update.

Final verification:

```bash
bun run build
bun run test
bun run typecheck
cd apps/literature-rpg && bun run generate && bun run validate && bun run start
bun packages/cli/dist/cli.js graph show library-mystery --root-dir apps/literature-rpg/src
```

## Risks

- If consumers expect every arbitrary edge property at top level, moving extras under `metadata` may surprise them. This adapter is runtime-facing, so preserving custom fields under `metadata` is the cleaner boundary.
- The first-node start convention remains implicit. This is acceptable for this slice because it matches current runtime behavior and avoids inventing a new authored graph field.
- Generated docs under `docs/api/` may need regeneration if public exports change. If TypeDoc output changes, include those updates in the same slice.
