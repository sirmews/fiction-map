# Engine Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the global singleton anti-pattern, solve the "Unlock Trap" so derived unlocks work seamlessly at runtime, clean up the noisy API, and establish a self-documenting mechanism.

**Architecture:** We will introduce a `FictionProject` (or `Registry`) class that holds all schemas instead of module-level let bindings. We will update the `GraphRuntime` to seamlessly accept `derivedState` alongside `runtimeState` during evaluation. We will cull the package `exports` in `index.ts` files, and finally add a script to generate API documentation automatically.

**Tech Stack:** TypeScript, Bun, Vitest

---

### Task 1: Introduce Project Context (Fix Global Singletons) - Core

**Files:**
- Modify: `packages/core/src/registry.ts` (create)
- Modify: `packages/core/src/node-type.ts`
- Modify: `packages/core/src/edge-type.ts`
- Modify: `packages/core/src/condition.ts`
- Modify: `packages/core/src/effect.ts`
- Modify: `packages/core/src/graph.ts`
- Modify: `packages/core/src/index.ts`
- Modify: `packages/core/src/examples/core.test.ts` (or relevant tests)

- [ ] **Step 1: Create the ProjectRegistry class**

Create `packages/core/src/registry.ts`:

```typescript
import type { NodeTypeDefinition, EdgeTypeDefinition, ConditionDefinition, EffectDefinition, GraphDefinition } from "./types";

export class ProjectRegistry {
  public nodeTypes = new Map<string, NodeTypeDefinition>();
  public edgeTypes = new Map<string, EdgeTypeDefinition>();
  public conditions = new Map<string, ConditionDefinition>();
  public effects = new Map<string, EffectDefinition>();
  public graphs = new Map<string, GraphDefinition>();

  clear() {
    this.nodeTypes.clear();
    this.edgeTypes.clear();
    this.conditions.clear();
    this.effects.clear();
    this.graphs.clear();
  }
}
```

- [ ] **Step 2: Update definition helpers to accept a registry**

Modify `packages/core/src/node-type.ts`, `edge-type.ts`, `condition.ts`, `effect.ts`, and `graph.ts` to no longer use internal Maps. 

Example for `node-type.ts`:
```typescript
import type { NodeTypeConfig, NodeTypeDefinition } from "./types";
import type { ProjectRegistry } from "./registry";

export function defineNodeType(registry: ProjectRegistry, config: NodeTypeConfig): NodeTypeDefinition {
  const definition: NodeTypeDefinition = {
    ...config,
    name: config.id, // Fallback
    location: { file: "unknown", line: 0, column: 0 },
    properties: config.properties || {},
    outgoingEdges: config.outgoingEdges || [],
    incomingEdges: config.incomingEdges || [],
  };
  registry.nodeTypes.set(config.id, definition);
  return definition;
}
```
*Apply similar changes to edge, condition, effect, and graph definitions, removing the old `get*` and `clear*` global functions.*

- [ ] **Step 3: Fix core tests**

Update `packages/core/src/index.test.ts` or wherever definitions are tested to instantiate `new ProjectRegistry()` and pass it to the definition functions.

- [ ] **Step 4: Run tests**

Run: `bun run --filter @fiction-map/core test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "refactor(core): replace global registries with ProjectRegistry class"
```

### Task 2: Introduce Project Context - Entities

**Files:**
- Modify: `packages/entities/src/registry.ts` (create)
- Modify: `packages/entities/src/entity-type.ts`
- Modify: `packages/entities/src/world.ts`
- Modify: `packages/entities/src/index.ts`
- Modify: `packages/story-runtime/src/examples/literature-rpg.test.ts`

- [ ] **Step 1: Create EntityRegistry class**

Create `packages/entities/src/registry.ts`:

```typescript
import { ProjectRegistry } from "@fiction-map/core";
import type { EntityTypeDefinition, WorldDefinition } from "./types";

export class EntityRegistry extends ProjectRegistry {
  public entityTypes = new Map<string, EntityTypeDefinition>();
  public worlds = new Map<string, WorldDefinition>();

  override clear() {
    super.clear();
    this.entityTypes.clear();
    this.worlds.clear();
  }
}
```

- [ ] **Step 2: Update entity definitions to use registry**

Modify `packages/entities/src/entity-type.ts` and `packages/entities/src/world.ts` to accept `EntityRegistry` instead of using local Maps.

- [ ] **Step 3: Fix runtime tests relying on entities**

Update `packages/story-runtime/src/examples/literature-rpg.test.ts` to instantiate `new EntityRegistry()` and pass it to `defineEntityType` and `defineWorld`.

- [ ] **Step 4: Run tests**

Run: `bun run --filter @fiction-map/entities test` and `bun run --filter @fiction-map/runtime test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/entities packages/story-runtime/src/examples
git commit -m "refactor(entities): replace global registries with EntityRegistry class"
```

### Task 3: Solve the Unlock Trap (Seamless Evaluation)

**Files:**
- Modify: `packages/story-runtime/src/types.ts`
- Modify: `packages/story-runtime/src/core/transition.ts`
- Modify: `packages/story-runtime/src/conditions/builtin.ts`

- [ ] **Step 1: Add DerivedState to EvaluationContext**

Modify `packages/story-runtime/src/types.ts` to include `DerivedEntityState` in `EvaluationContext`:

```typescript
import type { DerivedEntityState } from "./entities/derived";

export interface EvaluationContext {
  registry?: unknown
  scope?: string
  derivedState?: DerivedEntityState
  [key: string]: unknown
}
```

- [ ] **Step 2: Update built-in entity evaluators**

Modify `packages/story-runtime/src/conditions/builtin.ts`. Update `entityUnlockedEvaluator`, `hasEntityEvaluator`, and `entityActiveEvaluator` to check `context.derivedState.effectiveEntityIds` if provided.

Example:
```typescript
export const entityUnlockedEvaluator: ConditionEvaluator = (state, condition, context) => {
  const entityId = condition.entityId as string;
  // Check derived state first (cascading unlocks), fallback to explicit state
  if (context?.derivedState?.effectiveEntityIds?.has(entityId)) {
    return true;
  }
  return state.entityState?.unlocked.has(entityId) ?? false;
};
```

- [ ] **Step 3: Update checkTransitionAvailability**

Modify `packages/story-runtime/src/core/transition.ts` so that `checkTransitionAvailability` accepts an optional `EvaluationContext` and passes it to the evaluator.

- [ ] **Step 4: Verify in tests**

Update `literature-rpg.test.ts`. Create a test case showing that an entity in `derivedState` satisfies `checkTransitionAvailability` without calling `unlockEntity` on the runtime state directly.

- [ ] **Step 5: Run tests and commit**

```bash
bun test
git add packages/story-runtime
git commit -m "feat(runtime): allow evaluators to seamlessly read from derived state"
```

### Task 4: Clean Up Noisy Public API

**Files:**
- Modify: `packages/story-runtime/src/index.ts`
- Modify: `packages/core/src/index.ts`

- [ ] **Step 1: Clean runtime exports**

In `packages/story-runtime/src/index.ts`, remove exports for:
- `parseGraph`, `determineEndings`, `EdgeBlueprint`, `NodeBlueprint`, `GraphBlueprint`, `ParsedGraph` (keep them internal)
- Simplify built-ins by exposing a `registerBuiltins(registry)` helper if applicable, or keep them grouped but obscure internal traversal loop functions like `checkTransitionAvailability` if `GraphRuntime` class is preferred. *For now, just un-export the adapter stuff.*

- [ ] **Step 2: Clean core exports**

In `packages/core/src/index.ts`, remove `generateMetadata` and the old `get*/clear*` exports since they were deleted in Task 1.

- [ ] **Step 3: Test and build**

Run: `bun run build` and `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/index.ts packages/story-runtime/src/index.ts
git commit -m "refactor: clean up noisy public exports"
```

### Task 5: Implement Self-Documentation Mechanism

**Files:**
- Create: `scripts/generate-docs.ts`
- Modify: `package.json`

- [ ] **Step 1: Write doc generator script**

Create a script using TypeDoc or a custom AST parser to generate Markdown from the `src/index.ts` exports and TSDoc comments, outputting to `docs/api/`. Or, add `typedoc` as a dependency.

```bash
bun add -d typedoc typedoc-plugin-markdown
```

- [ ] **Step 2: Configure typedoc.json**

Create `typedoc.json`:
```json
{
  "entryPoints": [
    "packages/core/src/index.ts",
    "packages/entities/src/index.ts",
    "packages/story-runtime/src/index.ts"
  ],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludeInternal": true
}
```

- [ ] **Step 3: Add npm script**

Add to root `package.json`: `"docs:api": "typedoc"`

- [ ] **Step 4: Generate and commit**

Run: `bun run docs:api`
Ensure `docs/api` is generated.

```bash
git add package.json typedoc.json docs/api bun.lock
git commit -m "docs: implement self-documenting typedoc generation"
```
