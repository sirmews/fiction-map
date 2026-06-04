# Public API Audit

**Date:** 2026-05-19 (post-ergonomics refactor)
**Context:** Snapshot of the public surfaces of `@fiction-map/core`, `@fiction-map/entities`, and `@fiction-map/runtime` after Tasks 5–7 of the [engine-ergonomics plan](superpowers/plans/2026-05-18-engine-ergonomics.md) landed (commits `fe53a65`, `c932a16`, `438d95e`, `b370981`), updated after the authored-graph runtime adapter work on 2026-05-30. Use this document to judge what is safe for a consumer Story Editor to depend on.

The boundary this audit is measured against is documented in [docs/decisions/2026-05-16-headless-engine-direction.md](decisions/2026-05-16-headless-engine-direction.md).

---

## 1. `@fiction-map/core`

Source: [`packages/core/src/index.ts`](../packages/core/src/index.ts).

### Stable Consumer-Facing API

- **Registry:** `ProjectRegistry`
  - *Role:* Per-project container for node types, edge types, conditions, effects, and graphs. Replaces the previous module-level singletons.
- **Schema Definition Builders (all take `registry` as the first argument):**
  `defineNodeType`, `defineEdgeType`, `defineCondition`, `defineEffect`, `defineGraph`
- **Types (re-exported via `export * from "./types"`):**
  `PropertyType`, `PropertySchema`, `PropertyDefinition`, `NodeTypeDefinition`, `EdgeTypeDefinition`, `ConditionDefinition`, `EffectDefinition`, `GraphDefinition`, `NodeInstance`, `EdgeInstance`, `ValidationError`, `ValidationWarning`, `SourceLocation`.

### Resolved Smell — Split-Brain Runtime Types

The legacy `GraphState`, `TraversalResult`, and `TraceEvent` shapes have been removed from `packages/core/src/types.ts`. Runtime state, transition results, and traces now live in `@fiction-map/runtime`.

### What is no longer exported

The previous global helpers `getNodeTypes`, `clearNodeTypes`, `getEdgeTypes`, `clearEdgeTypes`, `getConditions`, `clearConditions`, `getEffects`, `clearEffects`, `getGraphs`, `clearGraphs`, and the standalone `generateMetadata` are gone. Consumers iterate `registry.nodeTypes` / `registry.edgeTypes` / etc. directly, or use the `fiction-map` CLI for metadata generation.

---

## 2. `@fiction-map/entities`

Source: [`packages/entities/src/index.ts`](../packages/entities/src/index.ts).

### Stable Consumer-Facing API

- **Registry:** `EntityRegistry` (extends `ProjectRegistry` from core)
- **Schema Definition Builders (take `registry` first):** `defineEntityType`, `defineWorld`
- **Types:** `EntityTypeDefinition`, `WorldDefinition`, `EntityReferenceDefinition`, `EntityModifier`, `EntityPrerequisite`, `EntityInstance`, plus supporting types from `./types`.

### What is no longer exported

`getEntityTypes`, `clearEntityTypes`, `getWorlds`, `clearWorlds`, and the standalone `generateEntityMetadata` helper. The same pattern as core: iterate `registry.entityTypes` / `registry.worlds`, or drive generation through the CLI.

---

## 3. `@fiction-map/runtime`

Source: [`packages/runtime/src/index.ts`](../packages/runtime/src/index.ts).

### Stable Consumer-Facing API (high level)

- **High-Level Engine:** `GraphRuntime` and its companion types `StepResult`, `PathStep`, `TraversalPath`.
- **Authored Graph Runtime Adapter:** `graphDefinitionToBlueprint`, `createRuntimeFromGraph`, plus the `GraphBlueprint`, `NodeBlueprint`, and `EdgeBlueprint` types accepted by `GraphRuntime`.
- **State Lifecycle:** `createInitialState`, `serializeState`, `deserializeState`, `cloneState`, `mergeState`.
- **Entity Derivation:** `deriveEntityState`, `ActiveEntityModifier`, `EntityPrerequisiteResult`, `DerivedEntityState`.
- **Entity-Aware Validation:** `validateEntityTransitionReferences`, `EntityTransitionReferenceError`, `EntityTransitionReferenceValidationResult`.
- **Core Runtime Types:** `GraphRuntimeState`, `EntityRuntimeState`, `Transition`, `TransitionAvailability`, `TransitionResult`, `TransitionTrace`, `Condition`, `ConditionSet`, `ConditionGroup`, `ConditionScope`, `FailedCondition`, `Consequence`, `NodeDefinition`, `GraphErrorType`, `GraphError`, `ValidationResult`, `SerializableState`, `SerializableEntityState`.
- **Extensibility Interfaces:** `ConditionEvaluator`, `EffectHandler`, `EvaluationContext` (now carries `derivedState`), `EffectContext`.

### Stable for Extension Authors

State read/write helpers used when implementing custom evaluators or handlers:
`setVariable`, `getVariable`, `incrementVariable`, `setFlag`, `clearFlag`, `hasFlag`, `getFlag`, `hasVisited`, `visitCount`, `navigateToNode`, `backtrack`, `grantEntity`, `revokeEntity`, `ownsEntity`, `activateEntity`, `deactivateEntity`, `entityIsActive`, `unlockEntity`, `lockEntity`, `entityIsUnlocked`, `addResource`, `spendResource`, `getResource`.

### Still Exported — Candidates For Future Pruning

These remain in `index.ts` and continue to power the literature-RPG example test. They are useful but leak the internal evaluation loop and crowd the public surface; a consumer app should generally prefer `GraphRuntime`:

- Low-level execution helpers: `checkTransitionAvailability`, `applyTransition`, `getAvailableTransitions`, `getTransitionsByAvailability`.
- Effect/condition primitives: `evaluateCondition`, `evaluateConditionSet`, `createComposedEvaluator`, `applyEffect`, `applyEffects`, `combineHandlers`.
- Graph validation primitives: `validateGraph`, `findReachableNodes`, `hasDanglingTransitions`, `hasUnreachableNodes`.
- Individual built-in evaluators and handlers (`equalsEvaluator`, `setVariableHandler`, etc.) alongside the aggregated `builtinEvaluators` / `builtinHandlers` maps.

*Recommendation:* keep them exported until `GraphRuntime` covers all current example flows. Consumers using metadata validation should prefer `registerBuiltins(registry)` over wiring individual built-in definitions manually.

### What Has Been Pruned

The low-level parser remains internal: `parseGraph`, `determineEndings`, and
`ParsedGraph` are not part of the public surface. The blueprint types
`GraphBlueprint`, `NodeBlueprint`, and `EdgeBlueprint` are exported because the
public `GraphRuntime` constructor accepts that shape. Consumers that already
have a core `GraphDefinition` should prefer `createRuntimeFromGraph()` or
`graphDefinitionToBlueprint()` instead of hand-writing a blueprint.

---

## Gaps / Open Questions

1. **`GraphRuntime.walk()` context recomputation.** The consumer app still uses an explicit `getByAvailability()` + `step()` loop because derived state must be recomputed between transitions.
2. **Lower-level helper exports.** Before helpers like `checkTransitionAvailability` are removed, `GraphRuntime` needs to demonstrate every current example flow.
3. **TypeDoc output.** API reference now lives under [`docs/api/`](api/) (generated via `bun run docs:api`). It is currently committed; decide whether to keep it in git or generate on demand.
