# Public API Audit

**Date:** 2026-05-19 (post-ergonomics refactor)
**Context:** Snapshot of the current public surfaces of `@fiction-map/core`, `@fiction-map/entities`, and `@fiction-map/runtime` after Tasks 5–7 of the [engine-ergonomics plan](superpowers/plans/2026-05-18-engine-ergonomics.md) landed (commits `fe53a65`, `c932a16`, `438d95e`, `b370981`). Use this document to judge what is safe for a consumer Story Editor to depend on.

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

### Known Smell — Split-Brain Runtime Types

`packages/core/src/types.ts` still defines and re-exports the legacy `GraphState`, `TraversalResult`, and `TraceEvent` shapes ([types.ts#L255-L290](../packages/core/src/types.ts#L255)). They overlap conceptually with the richer `GraphRuntimeState` / `TransitionResult` / `TransitionTrace` shapes in `@fiction-map/runtime`. They are reachable through `export * from "./types"` but are not used anywhere downstream.

*Recommendation:* mark them `@deprecated` and plan a follow-up to remove them in the next minor.

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

Source: [`packages/story-runtime/src/index.ts`](../packages/story-runtime/src/index.ts).

### Stable Consumer-Facing API (high level)

- **High-Level Engine:** `GraphRuntime` and its companion types `StepResult`, `PathStep`, `TraversalPath`.
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

*Recommendation:* keep them exported until `GraphRuntime` covers all current example flows, then move the individual primitives behind a `registerBuiltins(registry)` style entrypoint in a follow-up.

### What Has Been Pruned

The adapter layer is no longer in the public surface: `parseGraph`, `determineEndings`, `EdgeBlueprint`, `NodeBlueprint`, `GraphBlueprint`, `ParsedGraph`. They still exist in `packages/story-runtime/src/adapter.ts` for internal use by `GraphRuntime` but are not re-exported from `index.ts`.

---

## Gaps / Open Questions

1. **Legacy core runtime types** (`GraphState`, `TraversalResult`, `TraceEvent`) should be deprecated and removed; nothing in the current packages reads them.
2. **No `registerBuiltins(registry)` helper yet.** Consumers still wire `builtinEvaluators` / `builtinHandlers` manually, which is the lone friction point flagged by the Task 7 commit message but not fully addressed.
3. **`GraphRuntime` parity.** Before lower-level helpers like `checkTransitionAvailability` are removed, `GraphRuntime` needs to demonstrate every current example flow (notably the `{ derivedState }` evaluation path used in [`literature-rpg.test.ts`](../packages/story-runtime/src/examples/literature-rpg.test.ts)).
4. **TypeDoc output.** API reference now lives under [`docs/api/`](api/) (generated via `bun run docs:api`). It is currently committed; decide whether to keep it in git or generate on demand.
