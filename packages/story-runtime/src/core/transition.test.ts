import { describe, it, expect } from "vitest";
import {
  createInitialState,
  cloneState,
} from "../core/state";
import {
  evaluateConditionSet,
} from "../conditions";
import {
  applyEffect,
  applyEffects,
} from "../effects";
import {
  checkTransitionAvailability,
  applyTransition,
  getAvailableTransitions,
  getTransitionsByAvailability,
} from "../core/transition";
import {
  validateGraph,
  findReachableNodes,
  hasDanglingTransitions,
  hasUnreachableNodes,
} from "../core/validation";
import { builtinEvaluators } from "../conditions/builtin";
import { builtinHandlers } from "../effects/builtin";
import type { Transition, ConditionSet } from "../types";

describe("condition evaluation", () => {
  it("evaluates equals condition", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    const condition = { type: "equals" as const, key: "gold", value: 100 };
    
    const result = evaluateConditionSet(
      state,
      { all: [condition] },
      builtinEvaluators
    );
    
    expect(result).toBe(true);
  });
  
  it("evaluates greaterThan condition", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    const condition = { type: "greaterThan" as const, key: "gold", value: 50 };
    
    const result = evaluateConditionSet(
      state,
      { all: [condition] },
      builtinEvaluators
    );
    
    expect(result).toBe(true);
  });
  
  it("evaluates hasFlag condition", () => {
    let state = createInitialState("scene-1");
    state = { ...state, flags: { ...state.flags, "has-key": true } };
    
    const condition = { type: "hasFlag" as const, key: "has-key" };
    
    const result = evaluateConditionSet(
      state,
      { all: [condition] },
      builtinEvaluators
    );
    
    expect(result).toBe(true);
  });
  
  it("evaluates visited condition", () => {
    const state = createInitialState("scene-1");
    
    const condition = { type: "visited" as const, nodeId: "scene-1" };
    
    const result = evaluateConditionSet(
      state,
      { all: [condition] },
      builtinEvaluators
    );
    
    expect(result).toBe(true);
  });
  
  it("evaluates all/any/none composition", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    state = { ...state, flags: { ...state.flags, "has-key": true } };
    
    const conditionSet: ConditionSet = {
      all: [
        { type: "greaterThan", key: "gold", value: 50 },
        { type: "hasFlag", key: "has-key" },
      ],
      none: [
        { type: "equals", key: "gold", value: 0 },
      ],
    };
    
    const result = evaluateConditionSet(state, conditionSet, builtinEvaluators);
    
    expect(result).toBe(true);
  });
});

describe("effect application", () => {
  it("applies setVariable effect", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    const effect = { type: "setVariable" as const, key: "gold", value: 200 };
    
    const newState = applyEffect(state, effect, builtinHandlers);
    
    expect(newState.variables.gold).toBe(200);
    expect(state.variables.gold).toBe(100);
  });
  
  it("applies increment effect", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    const effect = { type: "increment" as const, key: "gold", delta: 50 };
    
    const newState = applyEffect(state, effect, builtinHandlers);
    
    expect(newState.variables.gold).toBe(150);
  });
  
  it("applies setFlag effect", () => {
    const state = createInitialState("scene-1");
    const effect = { type: "setFlag" as const, key: "has-key", value: true };
    
    const newState = applyEffect(state, effect, builtinHandlers);
    
    expect(newState.flags["has-key"]).toBe(true);
  });
  
  it("applies multiple effects in sequence", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    const effects = [
      { type: "increment" as const, key: "gold", delta: 50 },
      { type: "setFlag" as const, key: "opened-chest", value: true },
    ];
    
    const newState = applyEffects(state, effects, builtinHandlers);
    
    expect(newState.variables.gold).toBe(150);
    expect(newState.flags["opened-chest"]).toBe(true);
  });
});

describe("transition engine", () => {
  it("checks transition availability", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    
    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
    };
    
    const availability = checkTransitionAvailability(
      state,
      transition,
      builtinEvaluators
    );
    
    expect(availability.allowed).toBe(true);
    expect(availability.visible).toBe(true);
  });
  
  it("applies successful transition", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    
    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
      effects: [
        { type: "increment", key: "gold", delta: -50 },
        { type: "setFlag", key: "has-sword", value: true },
      ],
    };
    
    const result = applyTransition(
      state,
      transition,
      builtinEvaluators,
      builtinHandlers
    );
    
    expect(result.success).toBe(true);
    expect(result.shouldNavigate).toBe(true);
    expect(result.nextNodeId).toBe("scene-2");
    expect(result.state.variables.gold).toBe(50);
    expect(result.state.flags["has-sword"]).toBe(true);
    expect(result.state.currentNodeId).toBe("scene-2");
  });
  
  it("applies failed transition", () => {
    const state = createInitialState("scene-1", { gold: 10 });
    
    const transition: Transition = {
      id: "buy-sword",
      sourceNodeId: "scene-1",
      targetNodeId: "scene-2",
      requirements: {
        all: [{ type: "greaterThan", key: "gold", value: 50 }],
      },
      effects: [
        { type: "setFlag", key: "has-sword", value: true },
      ],
      failureEffects: [
        { type: "setFlag", key: "broke", value: true },
      ],
    };
    
    const result = applyTransition(
      state,
      transition,
      builtinEvaluators,
      builtinHandlers
    );
    
    expect(result.success).toBe(false);
    expect(result.failureReason).toBe("Requirements not met");
    expect(result.state.flags["has-sword"]).toBeUndefined();
    expect(result.state.flags["broke"]).toBe(true);
  });
  
  it("gets available transitions", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    
    const transitions: Transition[] = [
      {
        id: "buy-sword",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-2",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 50 }] },
      },
      {
        id: "buy-potion",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-3",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 200 }] },
      },
      {
        id: "go-east",
        sourceNodeId: "scene-2",
        targetNodeId: "scene-4",
      },
    ];
    
    const available = getAvailableTransitions(
      state,
      transitions,
      builtinEvaluators
    );
    
    expect(available).toHaveLength(1);
    expect(available[0].id).toBe("buy-sword");
  });
  
  it("groups transitions by availability", () => {
    const state = createInitialState("scene-1", { gold: 100 });
    
    const transitions: Transition[] = [
      {
        id: "buy-sword",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-2",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 50 }] },
      },
      {
        id: "buy-potion",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-3",
        requirements: { all: [{ type: "greaterThan", key: "gold", value: 200 }] },
      },
      {
        id: "secret-path",
        sourceNodeId: "scene-1",
        targetNodeId: "scene-4",
        visibility: { all: [{ type: "hasFlag", key: "knows-secret" }] },
      },
    ];
    
    const grouped = getTransitionsByAvailability(
      state,
      transitions,
      builtinEvaluators
    );
    
    expect(grouped.available).toHaveLength(1);
    expect(grouped.available[0].id).toBe("buy-sword");
    
    expect(grouped.blocked).toHaveLength(1);
    expect(grouped.blocked[0].id).toBe("buy-potion");
    
    expect(grouped.hidden).toHaveLength(1);
    expect(grouped.hidden[0].id).toBe("secret-path");
  });
});

describe("graph validation", () => {
  it("validates empty graph", () => {
    const nodes = new Map();
    const transitions: Transition[] = [];
    
    const result = validateGraph(nodes, transitions, "start");
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("empty-graph");
  });
  
  it("validates missing start node", () => {
    const nodes = new Map([["scene-1", { id: "scene-1" }]]);
    const transitions: Transition[] = [];
    
    const result = validateGraph(nodes, transitions, "nonexistent");
    
    expect(result.valid).toBe(false);
    expect(result.errors[0].type).toBe("missing-start-node");
  });
  
  it("validates dangling transitions", () => {
    const nodes = new Map([["scene-1", { id: "scene-1" }]]);
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "nonexistent" },
    ];
    
    const result = validateGraph(nodes, transitions, "scene-1");
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === "dangling-transition")).toBe(true);
  });
  
  it("validates unreachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["scene-2", { id: "scene-2" }],
      ["orphan", { id: "orphan" }],
    ]);
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "scene-2" },
    ];
    
    const result = validateGraph(nodes, transitions, "scene-1");
    
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.type === "unreachable-node")).toBe(true);
  });
  
  it("finds reachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["scene-2", { id: "scene-2" }],
      ["scene-3", { id: "scene-3" }],
    ]);
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "scene-2" },
      { id: "t2", sourceNodeId: "scene-2", targetNodeId: "scene-3" },
    ];
    
    const reachable = findReachableNodes(nodes, transitions, "scene-1");
    
    expect(reachable).toContain("scene-1");
    expect(reachable).toContain("scene-2");
    expect(reachable).toContain("scene-3");
  });
  
  it("detects dangling transitions", () => {
    const transitions: Transition[] = [
      { id: "t1", sourceNodeId: "scene-1", targetNodeId: "nonexistent" },
    ];
    const nodeIds = new Set(["scene-1"]);
    
    expect(hasDanglingTransitions(transitions, nodeIds)).toBe(true);
  });
  
  it("detects unreachable nodes", () => {
    const nodes = new Map([
      ["scene-1", { id: "scene-1" }],
      ["orphan", { id: "orphan" }],
    ]);
    const transitions: Transition[] = [];
    
    expect(hasUnreachableNodes(nodes, transitions, "scene-1")).toBe(true);
  });
});
