# Runtime From Authored Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authored `defineGraph` source drive both generated metadata and `GraphRuntime` execution for the literature-rpg consumer app.

**Architecture:** Add a small runtime-side adapter that converts `@fiction-map/core` `GraphDefinition` objects into the existing runtime `GraphBlueprint` shape. Keep the current `GraphRuntime` constructor intact, and expose a convenience `createRuntimeFromGraph()` helper for consumers. Then migrate `apps/literature-rpg` so the runtime imports the authored graph instead of repeating nodes and edges.

**Tech Stack:** TypeScript, Bun workspaces, Vitest, tsup, `@fiction-map/core`, `@fiction-map/runtime`, `fiction-map` CLI.

---

## File Structure

- Create `packages/runtime/src/graph-definition.test.ts`
  - Focused tests for converting a core `GraphDefinition` into a runtime `GraphBlueprint` and constructing a working `GraphRuntime`.
- Create `packages/runtime/src/graph-definition.ts`
  - Runtime adapter functions:
    - `graphDefinitionToBlueprint(graph: GraphDefinition): GraphBlueprint`
    - `createRuntimeFromGraph(graph: GraphDefinition, evaluators?, handlers?): GraphRuntime`
- Modify `packages/runtime/src/adapter.ts`
  - Add optional `metadata` to `EdgeBlueprint`.
  - Preserve `metadata` on parsed runtime transitions.
- Modify `packages/runtime/src/index.ts`
  - Export the two new public adapter helpers.
- Modify `apps/literature-rpg/src/graphs/story.graph.ts`
  - Move the `grantEntity` effect into the authored graph edge.
  - Remove the stale duplication note.
- Modify `apps/literature-rpg/src/main.ts`
  - Replace the manual `GraphRuntime` blueprint with `createRuntimeFromGraph(story)`.
- Modify `apps/literature-rpg/src/SEMANTICS.md` and `apps/literature-rpg/src/.fiction-map/metadata.json`
  - Regenerate via `bun run generate` from the consumer app.
- Modify `apps/literature-rpg/NOTES.md`
  - Mark the graph duplication item fixed, while preserving any remaining caveats.
- Modify `docs/public-api-audit.md`
  - Correct stale notes that say `GraphBlueprint` is not exported.
- Optionally modify `docs/api/**`
  - Only if `bun run docs:api` changes generated TypeDoc output.

---

### Task 1: Add Failing Runtime Adapter Tests

**Files:**
- Create: `packages/runtime/src/graph-definition.test.ts`
- Later modify: `packages/runtime/src/graph-definition.ts`
- Later modify: `packages/runtime/src/adapter.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/runtime/src/graph-definition.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { GraphDefinition } from "@fiction-map/core";
import {
  createInitialState,
  graphDefinitionToBlueprint,
  createRuntimeFromGraph,
} from "./index";

function makeGraph(): GraphDefinition {
  return {
    id: "library-mystery",
    name: "libraryMysteryGraph",
    location: { file: "graphs/story.graph.ts", line: 17, column: 22 },
    nodes: [
      { id: "entrance", type: "scene", title: "Entrance" },
      { id: "main-hall", type: "scene", title: "Main Hall" },
      { id: "dark-chapter", type: "scene", title: "Dark Chapter" },
    ],
    edges: [
      {
        id: "enter-hall",
        type: "choice",
        source: "entrance",
        target: "main-hall",
        text: "Step inside",
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      },
      {
        id: "descend",
        type: "choice",
        source: "main-hall",
        target: "dark-chapter",
        text: "Descend into the passage",
        conditions: [{ type: "hasEntity", entityId: "lantern" }],
        tone: "ominous",
      },
    ],
    nodeCount: 3,
    edgeCount: 2,
    maxDepth: 2,
    endings: ["dark-chapter"],
    nodeTypesUsed: ["scene"],
    edgeTypesUsed: ["choice"],
    conditionsUsed: ["hasEntity"],
    effectsUsed: ["grantEntity"],
    errors: [],
    warnings: [],
  };
}

describe("graphDefinitionToBlueprint", () => {
  it("maps a core graph definition into the runtime blueprint shape", () => {
    const blueprint = graphDefinitionToBlueprint(makeGraph());

    expect(blueprint).toEqual({
      nodes: [
        { id: "entrance", type: "scene" },
        { id: "main-hall", type: "scene" },
        { id: "dark-chapter", type: "scene" },
      ],
      edges: [
        {
          id: "enter-hall",
          source: "entrance",
          target: "main-hall",
          label: "Step inside",
          effects: [{ type: "grantEntity", entityId: "lantern" }],
          metadata: { type: "choice" },
        },
        {
          id: "descend",
          source: "main-hall",
          target: "dark-chapter",
          label: "Descend into the passage",
          conditions: [{ type: "hasEntity", entityId: "lantern" }],
          metadata: { type: "choice", tone: "ominous" },
        },
      ],
      endings: ["dark-chapter"],
    });
  });

  it("creates a runtime that can execute graph-definition edges", () => {
    const runtime = createRuntimeFromGraph(makeGraph());
    const state = createInitialState("entrance");

    const enterHall = runtime.getAvailable(state)[0];
    const result = runtime.step(state, enterHall);

    expect(result.success).toBe(true);
    expect(result.state.currentNodeId).toBe("main-hall");
    expect(result.state.entityState?.owned.has("lantern")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the runtime adapter test to verify it fails**

Run:

```bash
bun --cwd packages/runtime test src/graph-definition.test.ts
```

Expected: FAIL because `graphDefinitionToBlueprint` and `createRuntimeFromGraph` are not exported from `./index`.

- [ ] **Step 3: Commit the failing test**

```bash
git add packages/runtime/src/graph-definition.test.ts
git commit -m "test: specify runtime graph definition adapter"
```

---

### Task 2: Implement the Runtime Adapter

**Files:**
- Create: `packages/runtime/src/graph-definition.ts`
- Modify: `packages/runtime/src/adapter.ts`
- Modify: `packages/runtime/src/index.ts`
- Test: `packages/runtime/src/graph-definition.test.ts`

- [ ] **Step 1: Add metadata support to runtime edge blueprints**

Modify `packages/runtime/src/adapter.ts` so `EdgeBlueprint` includes `metadata` and `parseGraph()` forwards it:

```ts
export interface EdgeBlueprint {
  id: string
  source: string
  target?: string
  conditions?: Condition[]
  visibility?: Condition[]
  effects?: Effect[]
  failureEffects?: Effect[]
  failureTarget?: string
  label?: string
  metadata?: Record<string, unknown>
}
```

In `parseGraph()`, add `metadata: e.metadata` to the transition object:

```ts
export function parseGraph(blueprint: GraphBlueprint): ParsedGraph {
  const transitions: Transition[] = blueprint.edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    label: e.label,
    requirements: e.conditions?.length ? { all: e.conditions } : undefined,
    visibility: e.visibility?.length ? { all: e.visibility } : undefined,
    effects: e.effects?.length ? e.effects : undefined,
    failureEffects: e.failureEffects?.length ? e.failureEffects : undefined,
    failureTargetNodeId: e.failureTarget,
    metadata: e.metadata,
  }))

  const startNodeId =
    blueprint.startNode ?? blueprint.nodes[0]?.id

  const endingNodeIds = new Set(
    blueprint.endings ?? findTerminalNodes(blueprint.nodes, transitions)
  )

  const nodes = new Map(
    blueprint.nodes.map((n) => [n.id, { id: n.id, type: n.type }])
  )

  return { transitions, nodes, startNodeId, endingNodeIds }
}
```

- [ ] **Step 2: Add the graph-definition adapter implementation**

Create `packages/runtime/src/graph-definition.ts`:

```ts
import type { GraphDefinition, EdgeInstance } from "@fiction-map/core"
import type {
  ConditionEvaluator,
  EffectHandler,
} from "./types"
import { GraphRuntime } from "./runtime"
import type { EdgeBlueprint, GraphBlueprint } from "./adapter"

const EDGE_RUNTIME_KEYS = new Set([
  "id",
  "source",
  "target",
  "conditions",
  "effects",
  "text",
])

function edgeMetadata(edge: EdgeInstance): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(edge)) {
    if (!EDGE_RUNTIME_KEYS.has(key)) {
      metadata[key] = value
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function graphEdgeToBlueprint(edge: EdgeInstance): EdgeBlueprint {
  const blueprint: EdgeBlueprint = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }

  if (edge.conditions?.length) {
    blueprint.conditions = edge.conditions
  }

  if (edge.effects?.length) {
    blueprint.effects = edge.effects
  }

  if (typeof edge.text === "string") {
    blueprint.label = edge.text
  }

  const metadata = edgeMetadata(edge)
  if (metadata) {
    blueprint.metadata = metadata
  }

  return blueprint
}

export function graphDefinitionToBlueprint(graph: GraphDefinition): GraphBlueprint {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
    })),
    edges: graph.edges.map(graphEdgeToBlueprint),
    endings: graph.endings,
  }
}

export function createRuntimeFromGraph(
  graph: GraphDefinition,
  evaluators?: Map<string, ConditionEvaluator>,
  handlers?: Map<string, EffectHandler>
): GraphRuntime {
  return new GraphRuntime(
    graphDefinitionToBlueprint(graph),
    evaluators,
    handlers
  )
}
```

- [ ] **Step 3: Export the new helpers**

Modify `packages/runtime/src/index.ts` near the high-level runtime exports:

```ts
// Graph definition adapter
export {
  graphDefinitionToBlueprint,
  createRuntimeFromGraph,
} from "./graph-definition";
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run:

```bash
bun --cwd packages/runtime test src/graph-definition.test.ts
```

Expected: PASS, including both adapter tests.

- [ ] **Step 5: Run all runtime tests**

Run:

```bash
bun --cwd packages/runtime test
```

Expected: PASS for existing runtime tests plus `graph-definition.test.ts`.

- [ ] **Step 6: Commit the adapter implementation**

```bash
git add packages/runtime/src/adapter.ts packages/runtime/src/graph-definition.ts packages/runtime/src/index.ts
git commit -m "feat(runtime): create runtime from authored graph"
```

---

### Task 3: Migrate Literature RPG to the Authored Graph Runtime

**Files:**
- Modify: `apps/literature-rpg/src/graphs/story.graph.ts`
- Modify: `apps/literature-rpg/src/main.ts`
- Test: `apps/literature-rpg/src/main.test.ts`

- [ ] **Step 1: Add a failing consumer assertion for the authored graph effect**

Modify `apps/literature-rpg/src/main.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { playOnce, runtime } from "./main";
import { world } from "./world";

describe("literature-rpg consumer app", () => {
  it("world has no definition errors", () => {
    expect(world.errors).toEqual([]);
  });

  it("builds runtime transitions from the authored graph effects", () => {
    expect(runtime.transitions).toContainEqual(
      expect.objectContaining({
        id: "enter-hall",
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      })
    );
  });

  it("walks from the entrance through the gated descent", () => {
    const { visited, reachedEnding } = playOnce();

    expect(visited).toEqual(["entrance", "main-hall", "dark-chapter"]);
    expect(reachedEnding).toBe(true);
  });
});
```

- [ ] **Step 2: Run the consumer test to verify it fails**

Run:

```bash
bun --cwd apps/literature-rpg test
```

Expected: FAIL because the authored graph has no `grantEntity` effect yet, or because `main.ts` still builds the runtime from a manual blueprint rather than the authored graph.

- [ ] **Step 3: Move the effect into the authored graph**

Modify `apps/literature-rpg/src/graphs/story.graph.ts` to remove the duplication note and include the effect:

```ts
/**
 * Static graph definition for `fiction-map generate`.
 *
 * This drives `metadata.json`, `SEMANTICS.md`, and runtime execution so
 * agents, CI, and the app all read the same authored graph structure.
 */

import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { id: "entrance", type: "scene", title: "Entrance", body: "You stand at the entrance to the old library." },
    { id: "main-hall", type: "scene", title: "Main Hall", body: "Dust motes float in shafts of grey light. A lantern sits on a table." },
    { id: "dark-chapter", type: "scene", title: "Dark Chapter", body: "A narrow passage drops into darkness." },
  ],
  edges: [
    {
      id: "enter-hall",
      type: "choice",
      source: "entrance",
      target: "main-hall",
      text: "Step inside",
      effects: [{ type: "grantEntity", entityId: "lantern" }],
    },
    {
      id: "descend",
      type: "choice",
      source: "main-hall",
      target: "dark-chapter",
      text: "Descend into the passage",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
    },
  ],
});
```

- [ ] **Step 4: Create runtime from the authored graph**

Modify `apps/literature-rpg/src/main.ts`:

```ts
/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`,
 * walks from the entrance to the dark chapter, and prints each transition.
 * Granting the lantern at the main hall unlocks the gated `descend` choice.
 */

import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
} from "@fiction-map/runtime";
import { registry } from "./project";
import { story } from "./graphs/story.graph";
import { world } from "./world";

registerBuiltins(registry);

export const runtime = createRuntimeFromGraph(story);

export function playOnce(): { reachedEnding: boolean; visited: string[] } {
  let state = createInitialState(runtime.startNodeId);
  const visited: string[] = [state.currentNodeId];

  while (true) {
    const derivedState = deriveEntityState(world, state);
    const { available } = runtime.getByAvailability(state, { derivedState });
    if (available.length === 0) break;

    const choice = available[0];
    const result = runtime.step(state, choice, { derivedState });
    if (!result.success) break;

    state = result.state;
    visited.push(state.currentNodeId);
  }

  return {
    reachedEnding: state.currentNodeId === "dark-chapter",
    visited,
  };
}

// Only run when invoked directly (not when imported by tests).
// `import.meta.main` is a Bun extension; cast to any to satisfy tsc.
if ((import.meta as { main?: boolean }).main) {
  const result = playOnce();
  console.log("Visited:", result.visited.join(" → "));
  console.log("Reached ending:", result.reachedEnding);
  if (world.errors.length > 0) {
    console.error("World errors:", world.errors);
    process.exit(1);
  }
  process.exit(result.reachedEnding ? 0 : 1);
}
```

- [ ] **Step 5: Run the consumer tests**

Run:

```bash
bun --cwd apps/literature-rpg test
```

Expected: PASS. The new test confirms the runtime transition contains the authored `grantEntity` effect, and the existing traversal still reaches `dark-chapter`.

- [ ] **Step 6: Run the consumer app**

Run:

```bash
bun --cwd apps/literature-rpg run start
```

Expected:

```text
Visited: entrance → main-hall → dark-chapter
Reached ending: true
```

- [ ] **Step 7: Commit the consumer migration**

```bash
git add apps/literature-rpg/src/graphs/story.graph.ts apps/literature-rpg/src/main.ts apps/literature-rpg/src/main.test.ts
git commit -m "feat(app): run literature rpg from authored graph"
```

---

### Task 4: Regenerate Artifacts and Update Project Docs

**Files:**
- Modify: `apps/literature-rpg/src/.fiction-map/metadata.json`
- Modify: `apps/literature-rpg/src/SEMANTICS.md`
- Modify: `apps/literature-rpg/NOTES.md`
- Modify: `docs/public-api-audit.md`
- Optionally modify: `docs/api/**`

- [ ] **Step 1: Regenerate the consumer artifacts**

Run:

```bash
bun --cwd apps/literature-rpg run generate
```

Expected:

```text
✅ Generated metadata at .fiction-map/metadata.json
✅ Generated SEMANTICS.md
```

- [ ] **Step 2: Confirm generated artifacts show the effect**

Run:

```bash
rg -n "grantEntity|Effects used" apps/literature-rpg/src/.fiction-map/metadata.json apps/literature-rpg/src/SEMANTICS.md
```

Expected: output includes `grantEntity` in both generated files, and `SEMANTICS.md` shows `Effects used: grantEntity`.

- [ ] **Step 3: Update the friction log**

Modify the first item in `apps/literature-rpg/NOTES.md` to:

```md
## 1. ~~Two-layer schema duplication — same graph expressed twice~~ ✅ FIXED

Resolved by adding `graphDefinitionToBlueprint()` and
`createRuntimeFromGraph()` to `@fiction-map/runtime`, then moving the
`grantEntity` effect into the authored graph definition.

The static graph in [src/graphs/story.graph.ts](src/graphs/story.graph.ts)
now drives both generated artifacts and runtime execution in [src/main.ts](src/main.ts).
Generated `metadata.json` and `SEMANTICS.md` include the `grantEntity` effect on
`enter-hall`, so agents, CI, and the runtime share the same graph source.

Remaining caveat: `GraphRuntime` still uses the first authored node as the
start node because `defineGraph` does not expose an explicit `startNode` field.
That matches existing runtime behavior and is acceptable for this consumer proof.
```

Leave the rest of `NOTES.md` unchanged except for any numbering consistency the editor applies.

- [ ] **Step 4: Update stale public API audit text**

Find the stale paragraph:

```bash
rg -n "adapter layer|GraphBlueprint|parseGraph" docs/public-api-audit.md
```

Replace the stale text around the adapter layer with:

```md
The low-level parser remains internal: `parseGraph`, `determineEndings`, and
`ParsedGraph` are not part of the public surface. The blueprint types
`GraphBlueprint`, `NodeBlueprint`, and `EdgeBlueprint` are exported because the
public `GraphRuntime` constructor accepts that shape. Consumers that already
have a core `GraphDefinition` should prefer `createRuntimeFromGraph()` or
`graphDefinitionToBlueprint()` instead of hand-writing a blueprint.
```

- [ ] **Step 5: Regenerate API docs if TypeDoc output changes**

Run:

```bash
bun run docs:api
```

Expected: command succeeds. If `git status --short docs/api` shows changes, keep them in this task because public exports changed.

- [ ] **Step 6: Validate generated artifacts**

Run:

```bash
bun --cwd apps/literature-rpg run validate
```

Expected:

```text
Checked 1 graph: 0 errors, 0 warnings.
✅ Validation passed.
```

- [ ] **Step 7: Commit docs and generated artifacts**

```bash
git add apps/literature-rpg/src/.fiction-map/metadata.json apps/literature-rpg/src/SEMANTICS.md apps/literature-rpg/NOTES.md docs/public-api-audit.md docs/api
git commit -m "docs: reflect authored graph runtime adapter"
```

If `docs/api` has no changes, the `git add docs/api` command is harmless.

---

### Task 5: Final Verification and Closeout

**Files:**
- Inspect: all changed files
- No production code changes in this task unless verification exposes a concrete bug.

- [ ] **Step 1: Run root build**

Run:

```bash
bun run build
```

Expected: all workspace build scripts exit with code 0.

- [ ] **Step 2: Run root tests**

Run:

```bash
bun run test
```

Expected: all workspace tests pass, including the new runtime adapter tests and literature-rpg consumer tests.

- [ ] **Step 3: Run root typecheck**

Run:

```bash
bun run typecheck
```

Expected: all workspace typecheck scripts exit with code 0.

- [ ] **Step 4: Run the consumer generation, validation, and runtime smoke test**

Run:

```bash
bun --cwd apps/literature-rpg run generate
bun --cwd apps/literature-rpg run validate
bun --cwd apps/literature-rpg run start
```

Expected:

```text
Checked 1 graph: 0 errors, 0 warnings.
✅ Validation passed.
Visited: entrance → main-hall → dark-chapter
Reached ending: true
```

- [ ] **Step 5: Inspect the CLI graph view**

Run:

```bash
bun packages/cli/dist/cli.js graph show library-mystery --root-dir apps/literature-rpg/src
```

Expected: output includes:

```text
Graph: library-mystery
Conditions used: hasEntity
Effects used: grantEntity
```

- [ ] **Step 6: Check git state**

Run:

```bash
git status --short --branch
git log --oneline --decorate -n 8
```

Expected: worktree is clean after the task commits, and recent commits show the spec commit plus the implementation commits.

- [ ] **Step 7: If verification required fixes, return to the relevant task**

If a verification command exposes a bug, return to the task that introduced the
behavior, add a focused failing test when the bug is behavioral, make the
smallest targeted fix, and commit that task's changed files with a message that
matches the task scope. Do not amend earlier commits unless the user explicitly
asks for history cleanup.
