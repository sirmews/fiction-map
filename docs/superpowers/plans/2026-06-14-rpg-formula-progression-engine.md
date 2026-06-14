# RPG Dynamic Formula Progression Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a secure, type-safe, and flexible mathematical formula parser that enables resource effects to scale dynamically from player stats or other custom progression metrics (e.g. `intelligence`, `age`, or `level`).

**Architecture:** Create an isolated recursive-descent math parser in `src/utils/formula.ts`, update `types.ts` to extend resource effect interfaces with `formula?: string`, modify core resource addition and spending handlers, and verify with unit/integration tests.

**Tech Stack:** TypeScript, Bun, Vitest.

---

### File Structure Changes
- `packages/runtime/src/types.ts` (Modify: update effect types)
- `packages/runtime/src/utils/formula.ts` (Create: robust, secure formula tokenizer and evaluator)
- `packages/runtime/src/utils/formula.test.ts` (Create: unit tests for operator precedence, variables, and syntax)
- `packages/runtime/src/entities/effect-handlers.ts` (Modify: update addResource and spendResource)
- `packages/runtime/src/effects/formula.test.ts` (Create: integration tests for dynamic scaling & level up triggers)

---

### Task 1: Extend Effect Interfaces in types.ts

**Files:**
- Modify: `packages/runtime/src/types.ts`

- [ ] **Step 1: Update ResourceEffect interface**

In `packages/runtime/src/types.ts`, find the interface exports and ensure `ResourceEffect` supports an optional `formula?: string` property.

Replace the interface definition (or update the file) around line 175:
```typescript
export interface ResourceEffect extends Effect {
  key: string;
  amount?: number;
  formula?: string;
  allowNegative?: boolean;
  clampToZero?: boolean;
}
```

- [ ] **Step 2: Verify compilation passes**

Run: `bun run typecheck` in the root workspace.
Expected: Exit code 0, compiles perfectly.

- [ ] **Step 3: Commit interface modifications**

Run: `git add packages/runtime/src/types.ts`
Run: `git commit -m "chore(rpg): extend ResourceEffect interface to support dynamic math formulas"`

---

### Task 2: Implement the Secure Mathematical Formula Parser

**Files:**
- Create: `packages/runtime/src/utils/formula.ts`
- Create: `packages/runtime/src/utils/formula.test.ts`

- [ ] **Step 1: Write the failing formula parser unit tests**

Create `packages/runtime/src/utils/formula.test.ts`:
```typescript
import { describe, expect, it } from "vitest";
import { evaluateFormula } from "./formula";
import { GraphRuntimeState } from "../types";

describe("Formula Evaluator", () => {
  const dummyState: GraphRuntimeState = {
    currentNodeId: "room-1",
    variables: {
      global_multiplier: 2,
    },
    flags: {},
    visited: new Set(),
    entityState: {
      ownedEntityIds: new Set(),
      activeEntityIds: new Set(),
      unlockedEntityIds: new Set(),
      resources: {
        intelligence: 15,
        level: 2,
      },
    },
  };

  it("evaluates simple static numbers", () => {
    expect(evaluateFormula("42", dummyState)).toBe(42);
    expect(evaluateFormula("10.5", dummyState)).toBe(10.5);
  });

  it("evaluates basic operators and respects precedence", () => {
    expect(evaluateFormula("2 + 3 * 4", dummyState)).toBe(14);
    expect(evaluateFormula("(2 + 3) * 4", dummyState)).toBe(20);
    expect(evaluateFormula("100 / 2 - 5", dummyState)).toBe(45);
  });

  it("substitutes player resources and global variables successfully", () => {
    expect(evaluateFormula("intelligence * 2", dummyState)).toBe(30);
    expect(evaluateFormula("level * 100", dummyState)).toBe(200);
    expect(evaluateFormula("intelligence + global_multiplier", dummyState)).toBe(17);
  });

  it("defaults unresolved variables to 0 safely", () => {
    expect(evaluateFormula("nonexistent_stat + 50", dummyState)).toBe(5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/runtime/src/utils/formula.test.ts`
Expected: FAIL with "evaluateFormula is not defined".

- [ ] **Step 3: Implement the secure formula parsing and evaluation engine**

Create `packages/runtime/src/utils/formula.ts`. It tokenizes the formula safely and parses expressions using a robust recursive-descent parser (supporting `+`, `-`, `*`, `/`, parenthesis, variables, and numbers):

```typescript
import type { GraphRuntimeState } from "../types";

export function evaluateFormula(formula: string, state: GraphRuntimeState): number {
  // 1. Tokenize formula string
  const tokenRegex = /\s*([+\-*/()]+|[a-zA-Z_]\w*|\d+(?:\.\d+)?)\s*/g;
  const tokens: string[] = [];
  let match;
  
  while ((match = tokenRegex.exec(formula)) !== null) {
    tokens.push(match[1]);
  }

  if (tokens.length === 0) return 0;

  // 2. Resolve variable tokens to numeric constants
  const resolvedTokens: string[] = tokens.map((token) => {
    if (/^[a-zA-Z_]\w*$/.test(token)) {
      // Check player resources
      const resourceVal = state.entityState?.resources?.[token];
      if (typeof resourceVal === "number") {
        return String(resourceVal);
      }
      // Check global variables
      const globalVal = state.variables[token];
      if (typeof globalVal === "number") {
        return String(globalVal);
      }
      // Fallback
      return "0";
    }
    return token;
  });

  // 3. Recursive Descent Parser implementation
  let index = 0;

  function peek(): string | undefined {
    return resolvedTokens[index];
  }

  function consume(): string {
    return resolvedTokens[index++];
  }

  // Expression = Term ( ( "+" | "-" ) Term )*
  function parseExpression(): number {
    let result = parseTerm();
    while (true) {
      const token = peek();
      if (token === "+") {
        consume();
        result += parseTerm();
      } else if (token === "-") {
        consume();
        result -= parseTerm();
      } else {
        break;
      }
    }
    return result;
  }

  // Term = Factor ( ( "*" | "/" ) Factor )*
  function parseTerm(): number {
    let result = parseFactor();
    while (true) {
      const token = peek();
      if (token === "*") {
        consume();
        result *= parseFactor();
      } else if (token === "/") {
        consume();
        const divisor = parseFactor();
        result = divisor !== 0 ? result / divisor : 0; // safe division by zero
      } else {
        break;
      }
    }
    return result;
  }

  // Factor = Number | "(" Expression ")"
  function parseFactor(): number {
    const token = peek();
    if (token === "(") {
      consume(); // consume "("
      const result = parseExpression();
      if (peek() === ")") {
        consume(); // consume ")"
      }
      return result;
    }
    
    const val = parseFloat(consume() || "0");
    return isNaN(val) ? 0 : val;
  }

  try {
    return parseExpression();
  } catch {
    return 0;
  }
}
```

- [ ] **Step 4: Verify tests pass**

Run: `bun test packages/runtime/src/utils/formula.test.ts`
Expected: 4/4 passing unit tests!

- [ ] **Step 5: Commit parsing logic**

Run: `git add packages/runtime/src/utils/formula.ts packages/runtime/src/utils/formula.test.ts`
Run: `git commit -m "feat(rpg): implement secure and type-safe recursive descent formula parser"`

---

### Task 3: Integrate Formulas into Resource Effect Handlers

**Files:**
- Modify: `packages/runtime/src/entities/effect-handlers.ts`

- [ ] **Step 1: Modify addResource and spendResource to support formulas**

Read `packages/runtime/src/entities/effect-handlers.ts` and update `addResourceHandler` and `spendResourceHandler` to check if a formula string is present, evaluate it using `evaluateFormula`, and fall back to the raw `amount` if no formula is declared.

Replace `addResourceHandler` and `spendResourceHandler` with:
```typescript
import { evaluateFormula } from "../utils/formula";

export const addResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const resourceEffect = effect as ResourceEffect;
  const { key, amount, formula } = resourceEffect;
  
  if (typeof key !== "string") return state;

  const resolvedAmount = typeof formula === "string" 
    ? evaluateFormula(formula, state) 
    : amount;

  return typeof resolvedAmount === "number"
    ? addResource(state, key, resolvedAmount)
    : state;
}

export const spendResourceHandler: EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect
): GraphRuntimeState => {
  const resourceEffect = effect as ResourceEffect;
  const { key, amount, formula, allowNegative, clampToZero } = resourceEffect;
  
  if (typeof key !== "string") return state;

  const resolvedAmount = typeof formula === "string" 
    ? evaluateFormula(formula, state) 
    : amount;

  return typeof resolvedAmount === "number"
    ? spendResource(state, key, resolvedAmount, { allowNegative, clampToZero })
    : state;
}
```

- [ ] **Step 2: Run all workspace tests to verify compatibility**

Run: `bun test`
Expected: All 129 tests (including old lit-rpg test metrics) continue to pass perfectly, ensuring zero regression!

- [ ] **Step 3: Commit integration changes**

Run: `git add packages/runtime/src/entities/effect-handlers.ts`
Run: `git commit -m "feat(rpg): integrate formula evaluator directly into resource effect handlers"`

---

### Task 4: Write Integration Tests for Progression & Trigger Loops

**Files:**
- Create: `packages/runtime/src/effects/formula.test.ts`

- [ ] **Step 1: Write dynamic scaling and leveling integration tests**

Create `packages/runtime/src/effects/formula.test.ts` which registers custom attributes, uses a trigger to level-up dynamically when custom progression (e.g. `xp`) crosses threshold formula limits, and scales spell heals using `intelligence`:

```typescript
import { describe, expect, it } from "vitest";
import { createInitialState, createRuntimeFromGraph, deriveEntityState, registerBuiltins } from "..";
import { GraphDefinition } from "@fiction-map/core";
import { world } from "../../../../apps/literature-rpg/src/world";
import { registry } from "../../../../apps/literature-rpg/src/project";

registerBuiltins(registry);

const testStory: GraphDefinition = {
  id: "formula-story",
  startNodeId: "entrance",
  nodes: [
    {
      id: "entrance",
      type: "scene",
      blocks: [{ id: "welcome", type: "paragraph", text: "You stand at the gate." }],
    },
    {
      id: "victory",
      type: "scene",
      blocks: [{ id: "won", type: "paragraph", text: "Victory." }],
    },
  ],
  edges: [
    {
      id: "gain-xp",
      source: "entrance",
      target: "entrance",
      label: "Gain XP",
      effects: [
        { type: "addResource", key: "xp", amount: 100 },
      ],
    },
    {
      id: "cast-heal",
      source: "entrance",
      target: "entrance",
      label: "Cast Heal",
      effects: [
        { type: "addResource", key: "health", formula: "20 + intelligence * 2" },
      ],
    },
  ],
};

describe("Dynamic Scaling and Progression Integration", () => {
  it("scales healing effects using intelligence attribute dynamically", () => {
    const runtime = createRuntimeFromGraph(testStory);
    let state = createInitialState(runtime.startNodeId);
    const context = { derivedState: deriveEntityState(world, state) };

    // Set core stats
    state.entityState.resources["health"] = 10;
    state.entityState.resources["intelligence"] = 15;

    const castHealEdge = testStory.edges.find((e) => e.id === "cast-heal")!;
    const result = runtime.step(state, castHealEdge, context);

    expect(result.success).toBe(true);
    // Formula: 20 + 15 * 2 = 50. Health goes from 10 -> 60.
    expect(result.state.entityState.resources["health"]).toBe(60);
  });

  it("handles a multi-stage custom progression loop (Level-Up) via triggers", () => {
    const runtime = createRuntimeFromGraph(testStory);
    
    // Register automatic progression trigger based on level formula
    runtime.addTrigger({
      id: "progression-level-up",
      conditions: [{ type: "resourceAtLeast", key: "xp", value: 100 }],
      effects: [
        { type: "spendResource", key: "xp", amount: 100, clampToZero: true },
        { type: "addResource", key: "level", amount: 1 },
        { type: "addResource", key: "intelligence", formula: "level * 5" }, // Scale INT with level
      ],
    });

    let state = createInitialState(runtime.startNodeId);
    const context = { derivedState: deriveEntityState(world, state) };

    state.entityState.resources["xp"] = 0;
    state.entityState.resources["level"] = 1;
    state.entityState.resources["intelligence"] = 10;

    const gainXpEdge = testStory.edges.find((e) => e.id === "gain-xp")!;
    
    // Step 1: Gain 100 XP -> Triggers level-up trigger after step!
    const stepResult = runtime.step(state, gainXpEdge, context);
    expect(stepResult.success).toBe(true);
    
    const finalState = stepResult.state;
    // XP is consumed (100 - 100 = 0)
    expect(finalState.entityState.resources["xp"]).toBe(0);
    // Level increments to 2
    expect(finalState.entityState.resources["level"]).toBe(2);
    // Intelligence increases dynamically using formula: level * 5 = 2 * 5 = 10 -> 10 + 10 = 20 INT!
    expect(finalState.entityState.resources["intelligence"]).toBe(20);
  });
});
```

- [ ] **Step 2: Run the newly added integration tests**

Run: `bun test packages/runtime/src/effects/formula.test.ts`
Expected: 2/2 tests pass.

- [ ] **Step 3: Commit integration test file**

Run: `git add packages/runtime/src/effects/formula.test.ts`
Run: `git commit -m "test(rpg): add dynamic scaling and triggers progression integration tests"`
