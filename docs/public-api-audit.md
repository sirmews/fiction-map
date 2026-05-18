# Public API Audit

**Date:** 2026-05-18
**Context:** This document analyzes the current exports of `@fiction-map/core`, `@fiction-map/entities`, and `@fiction-map/runtime` to identify stable consumer-facing APIs versus implementation details, based on the headless engine boundary established in `docs/plans/literature-rpg/05-consumer-app-readiness-plan.md`.

---

## 1. `@fiction-map/core`

This package defines the generic graph abstractions, metadata schemas, and authoring primitives.

### Stable Consumer-Facing API
*   **Schema Definition Builders:** `defineNodeType`, `defineEdgeType`, `defineCondition`, `defineEffect`, `defineGraph`
    *   *Role:* Used by the consumer app to define their specific node types, edge types, and graph topology.
*   **Types:** `PropertyType`, `PropertySchema`, `PropertyDefinition`, `NodeTypeDefinition`, `EdgeTypeDefinition`, `ConditionDefinition`, `EffectDefinition`, `GraphDefinition`
    *   *Role:* Core building blocks for the editor's schema validation and typing.

### Questionable / Implementation Details
*   **Global Registry Methods:** `getNodeTypes`, `getNodeType`, `clearNodeTypes`, `getEdgeTypes`, `getEdgeType`, `clearEdgeTypes`, `getConditions`, `getCondition`, `clearConditions`, `getEffects`, `getEffect`, `clearEffects`, `getGraphs`, `getGraph`, `clearGraphs`
    *   *Issue:* Relying on global mutable singleton state makes it harder for a Story Editor to manage multiple projects, namespaces, or hot-reloading reliably. An explicit `Registry` class or context might be better.
*   **Split-Brain Runtime Types:** `GraphState`, `TraversalResult`, `TraceEvent`
    *   *Issue:* These exist in the `core` package but overlap conceptually with the much richer `GraphRuntimeState` and `TransitionResult` defined in `@fiction-map/runtime`. They should likely be unified or moved entirely to `runtime`.
*   **Internal Helpers:** `generateMetadata`
    *   *Issue:* While useful, it feels like an internal generation step that could be named better or encapsulated in the Graph validation pipeline.

---

## 2. `@fiction-map/entities`

This package defines the consumer-owned world/entity abstractions.

### Stable Consumer-Facing API
*   **Schema Definition Builders:** `defineEntityType`, `defineWorld`
    *   *Role:* Used to specify what entities exist (e.g., characters, items) and instantiate the world.
*   **Types:** `EntityTypeDefinition`, `WorldDefinition`, `EntityReferenceDefinition`, `EntityModifier`, `EntityPrerequisite`, `EntityInstance`

### Questionable / Implementation Details
*   **Global Registry Methods:** `getEntityTypes`, `getEntityType`, `clearEntityTypes`, `getWorlds`, `getWorld`, `clearWorlds`
    *   *Issue:* Same as core. Global singletons are an anti-pattern for a consumer editor app that might need to isolate different world instances or manage memory tightly.
*   **Internal Helpers:** `generateEntityMetadata`
    *   *Issue:* Likely an internal detail of world definition compilation.

---

## 3. `@fiction-map/runtime`

This package is responsible for state transition, condition evaluation, effect application, and runtime graph traversal.

### Stable Consumer-Facing API
*   **High-Level Engine:** `GraphRuntime`
    *   *Role:* The primary entry point for the consumer app to run a graph.
*   **Core Types:** `GraphRuntimeState`, `EntityRuntimeState`, `Transition`, `TransitionResult`, `TransitionAvailability`, `SerializableState`, `SerializableEntityState`
    *   *Role:* Fundamental runtime contracts for reading state, rendering availability, and persisting saves.
*   **Entity Runtime Features:** `deriveEntityState`, `validateEntityTransitionReferences`
    *   *Role:* Allows the consumer app to merge authored worlds with runtime state and validate references statically.
*   **Extensibility Interfaces:** `ConditionEvaluator`, `EffectHandler`, `EvaluationContext`, `EffectContext`
    *   *Role:* Necessary for a consumer app to define its own logic (e.g., specific RPG mechanics).

### Consumer-Facing (For Extension Authors)
*   **State Mutation / Read Helpers:** `setVariable`, `getVariable`, `grantEntity`, `revokeEntity`, `hasFlag`, `navigateToNode`, etc.
    *   *Role:* These shouldn't be called directly by the app to mutate state outside the engine's loop, but they *are* required by consumer apps when writing custom `EffectHandler` or `ConditionEvaluator` implementations.

### Questionable / Implementation Details
*   **Adapter & Parsing:** `parseGraph`, `determineEndings`, `EdgeBlueprint`, `NodeBlueprint`, `GraphBlueprint`, `ParsedGraph`
    *   *Issue:* These feel like internal translation layers converting the static `GraphDefinition` into a shape the engine uses internally. They probably shouldn't be public.
*   **Low-Level Execution Steps:** `checkTransitionAvailability`, `applyTransition`, `getAvailableTransitions`, `getTransitionsByAvailability`, `evaluateCondition`, `evaluateConditionSet`, `applyEffect`, `applyEffects`
    *   *Issue:* Exposing these directly leaks the internal engine loop. Consumers should rely on `GraphRuntime.step()` or `GraphRuntime.evaluateTransitions()` instead of manually piecing the loop together.
*   **Built-in Concrete Implementations:** `equalsEvaluator`, `setVariableHandler`, `builtinEvaluators`, `builtinHandlers`, etc.
    *   *Issue:* While helpful, exporting every single built-in evaluator and handler crowds the API. Providing an explicit registry initialization like `registerBuiltinExtensions(registry)` would be cleaner.

---

## Missing Exports or Functionality
*   **Registry/Context Abstraction:** A way to instantiate a project or workspace context without relying on `core`/`entities` global module state.
*   **Explicit Initializer:** A method to initialize the default engine (e.g., with all built-in conditions/effects pre-registered) rather than having the consumer wire `builtinEvaluators` manually.
