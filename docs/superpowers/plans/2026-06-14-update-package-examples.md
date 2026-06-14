# Update Package-Level Examples Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the framework-level example test `packages/runtime/src/examples/literature-rpg.test.ts` to include assertions verifying reactive state triggers (reusable stamina regeneration), keeping our package test coverage aligned with the new runtime features.

**Architecture:** We will add a dedicated unit test inside `literature-rpg.test.ts` that registers a stamina regeneration trigger on the runtime, executes a transition that spends stamina, and asserts that the trigger fires reactively.

**Tech Stack:** TypeScript, Bun, Bun Test

---

### Task 1: Update Test and Verify

**Files:**
- Modify: `packages/runtime/src/examples/literature-rpg.test.ts` (add the `executes state triggers reactively during traversal` test case).

- [ ] **Step 1: Write test case inside literature-rpg.test.ts**

Read `packages/runtime/src/examples/literature-rpg.test.ts` and add the trigger-checking test at the end of the file:

```typescript
// Add at the bottom of the describe("literature RPG example") block, right before the closing "});":

  it("executes state triggers reactively during traversal", () => {
    const runtime = new GraphRuntime({
      startNode: "forest-edge",
      nodes: [
        { id: "forest-edge", type: "location" },
        { id: "dark-cave", type: "location" },
      ],
      edges: [
        {
          id: "enter-dark-cave",
          source: "forest-edge",
          target: "dark-cave",
          effects: [
            { type: "spendResource", key: "stamina", amount: 3 },
          ],
        },
      ],
    });

    // Add a trigger: if stamina is less than 5, regenerate 1 stamina
    runtime.addTrigger({
      id: "stamina-regen",
      conditions: [{ type: "resourceLessThan", key: "stamina", value: 5 }],
      effects: [{ type: "addResource", key: "stamina", amount: 1 }],
    });

    let state = createInitialState("forest-edge");
    state = addResource(state, "stamina", 5);

    // Initial stamina is 5
    expect(getResource(state, "stamina")).toBe(5);

    // Step: spends 3 stamina (leaves 2).
    // The trigger fires because 2 < 5, adding +1 stamina (final 3)!
    const transition = runtime.transitions.find((t) => t.id === "enter-dark-cave")!;
    const result = runtime.step(state, transition);

    expect(result.success).toBe(true);
    expect(result.state.currentNodeId).toBe("dark-cave");
    expect(getResource(result.state, "stamina")).toBe(3); // 5 - 3 + 1 = 3!
  });
```

- [ ] **Step 2: Run the test suite**

Run: `bun test packages/runtime/src/examples/literature-rpg.test.ts`
Expected: Success

- [ ] **Step 3: Run full typecheck and builds**

Run: `bun run build && bun run typecheck`
Expected: Success

- [ ] **Step 4: Commit changes**

```bash
git add packages/runtime/src/examples/literature-rpg.test.ts
git commit -m "test(runtime): add triggers coverage to literature-rpg package-level example"
```
