import { describe, it, expect } from "vitest";
import {
  createInitialState,
  cloneState,
  navigateToNode,
  setFlag,
  setVariable,
  incrementVariable,
  hasVisited,
  hasFlag,
  getFlag,
  getVariable,
  serializeState,
  deserializeState,
  grantEntity,
  revokeEntity,
  ownsEntity,
  activateEntity,
  deactivateEntity,
  entityIsActive,
  unlockEntity,
  lockEntity,
  entityIsUnlocked,
  addResource,
  spendResource,
  getResource,
} from "../core/state";
import type { GraphRuntimeState } from "../types";

describe("createInitialState", () => {
  it("creates state with start node", () => {
    const state = createInitialState("scene-1");
    
    expect(state.currentNodeId).toBe("scene-1");
    expect(state.history).toEqual([]);
    expect(state.visited).toContain("scene-1");
    expect(state.variables).toEqual({});
    expect(state.flags).toEqual({});
  });
  
  it("creates state with initial variables", () => {
    const state = createInitialState("scene-1", { gold: 100, health: 50 });
    
    expect(state.variables.gold).toBe(100);
    expect(state.variables.health).toBe(50);
  });
  
  it("creates state with extensions", () => {
    const state = createInitialState("scene-1", {}, { character: { name: "Hero" } });
    
    expect(state.extensions?.character).toEqual({ name: "Hero" });
  });
});

describe("cloneState", () => {
  it("creates a deep copy", () => {
    const original = createInitialState("scene-1", { gold: 100 });
    original.flags["has-key"] = true;
    
    const cloned = cloneState(original);
    
    expect(cloned).not.toBe(original);
    expect(cloned.variables).not.toBe(original.variables);
    expect(cloned.flags).not.toBe(original.flags);
    expect(cloned.visited).not.toBe(original.visited);
    
    cloned.variables.gold = 200;
    expect(original.variables.gold).toBe(100);
  });
});

describe("navigateToNode", () => {
  it("updates current node and history", () => {
    let state = createInitialState("scene-1");
    state = navigateToNode(state, "scene-2");
    
    expect(state.currentNodeId).toBe("scene-2");
    expect(state.history).toEqual(["scene-1"]);
    expect(state.visited).toContain("scene-2");
  });
  
  it("preserves previous state", () => {
    const original = createInitialState("scene-1");
    const navigated = navigateToNode(original, "scene-2");
    
    expect(original.currentNodeId).toBe("scene-1");
    expect(original.history).toEqual([]);
    expect(navigated.currentNodeId).toBe("scene-2");
  });
});

describe("flags", () => {
  it("sets and checks flags", () => {
    let state = createInitialState("scene-1");
    
    expect(hasFlag(state, "has-key")).toBe(false);
    
    state = setFlag(state, "has-key", true);
    
    expect(hasFlag(state, "has-key")).toBe(true);
    expect(getFlag(state, "has-key")).toBe(true);
  });
  
  it("clears flags", () => {
    let state = createInitialState("scene-1");
    state = setFlag(state, "has-key", true);
    
    expect(hasFlag(state, "has-key")).toBe(true);
    
    state = setFlag(state, "has-key", false);
    
    expect(getFlag(state, "has-key")).toBe(false);
  });
});

describe("variables", () => {
  it("sets and gets variables", () => {
    let state = createInitialState("scene-1");
    
    expect(getVariable(state, "gold")).toBeUndefined();
    
    state = setVariable(state, "gold", 100);
    
    expect(getVariable(state, "gold")).toBe(100);
  });
  
  it("increments numeric variables", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    
    state = incrementVariable(state, "gold", 50);
    
    expect(getVariable(state, "gold")).toBe(150);
  });
  
  it("ignores increment on non-numeric", () => {
    let state = createInitialState("scene-1", { name: "Hero" });
    
    state = incrementVariable(state, "name", 1);
    
    expect(getVariable(state, "name")).toBe("Hero");
  });
});

describe("visited", () => {
  it("tracks visited nodes", () => {
    const state = createInitialState("scene-1");
    
    expect(hasVisited(state, "scene-1")).toBe(true);
    expect(hasVisited(state, "scene-2")).toBe(false);
  });
});

describe("entity-aware runtime state", () => {
  it("tracks owned entities immutably", () => {
    const original = createInitialState("scene-1");
    const granted = grantEntity(original, "lantern");

    expect(ownsEntity(original, "lantern")).toBe(false);
    expect(ownsEntity(granted, "lantern")).toBe(true);

    const revoked = revokeEntity(granted, "lantern");

    expect(ownsEntity(granted, "lantern")).toBe(true);
    expect(ownsEntity(revoked, "lantern")).toBe(false);
  });

  it("tracks active and unlocked entities", () => {
    let state = createInitialState("scene-1");

    state = activateEntity(state, "elf");
    state = unlockEntity(state, "dark-cave");

    expect(entityIsActive(state, "elf")).toBe(true);
    expect(entityIsUnlocked(state, "dark-cave")).toBe(true);

    state = deactivateEntity(state, "elf");
    state = lockEntity(state, "dark-cave");

    expect(entityIsActive(state, "elf")).toBe(false);
    expect(entityIsUnlocked(state, "dark-cave")).toBe(false);
  });

  it("tracks resources without allowing overspend", () => {
    let state = createInitialState("scene-1");

    state = addResource(state, "gold", 10);
    expect(getResource(state, "gold")).toBe(10);

    state = spendResource(state, "gold", 4);
    expect(getResource(state, "gold")).toBe(6);

    const unchanged = spendResource(state, "gold", 99);
    expect(unchanged).toBe(state);
    expect(getResource(unchanged, "gold")).toBe(6);
  });
});

describe("serialization", () => {
  it("serializes and deserializes state", () => {
    let state = createInitialState("scene-1", { gold: 100 });
    state = setFlag(state, "has-key", true);
    state = navigateToNode(state, "scene-2");
    
    const serialized = serializeState(state);
    const json = JSON.stringify(serialized);
    const parsed = JSON.parse(json);
    const restored = deserializeState(parsed);
    
    expect(restored.currentNodeId).toBe("scene-2");
    expect(restored.history).toEqual(["scene-1"]);
    expect(restored.variables.gold).toBe(100);
    expect(restored.flags["has-key"]).toBe(true);
    expect(restored.visited.has("scene-1")).toBe(true);
    expect(restored.visited.has("scene-2")).toBe(true);
  });

  it("serializes and deserializes entity-aware state", () => {
    let state = createInitialState("scene-1");
    state = grantEntity(state, "lantern");
    state = activateEntity(state, "elf");
    state = unlockEntity(state, "dark-cave");
    state = addResource(state, "gold", 12);

    const serialized = serializeState(state);
    const json = JSON.stringify(serialized);
    const restored = deserializeState(JSON.parse(json));

    expect(ownsEntity(restored, "lantern")).toBe(true);
    expect(entityIsActive(restored, "elf")).toBe(true);
    expect(entityIsUnlocked(restored, "dark-cave")).toBe(true);
    expect(getResource(restored, "gold")).toBe(12);
  });
});
