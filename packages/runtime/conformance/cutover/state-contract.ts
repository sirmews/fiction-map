import assert from "node:assert/strict"
import {
  addResource,
  backtrack,
  cloneState,
  createInitialState,
  deserializeState,
  getResource,
  hasVisited,
  incrementVariable,
  mergeState,
  navigateToNode,
  serializeState,
  setFlag,
  setVariable,
  spendResource,
  visitCount,
} from "@fiction-map/runtime"

export function checkStateContract() {
  const opaqueFunction = () => 42
  const opaqueMap = new Map([[Symbol("key"), opaqueFunction]])
  const undefinedField = { value: undefined }
  const entityState = {
    owned: new Set(["item"]),
    active: new Set<string>(),
    unlocked: new Set(["quest"]),
    resources: { gold: 3 },
    extensions: { opaqueFunction },
  }
  const seed = { ...undefinedField, opaqueMap }
  const extensions = { opaqueFunction }
  const initial = createInitialState("start", seed, extensions, entityState)

  assert.equal(backtrack(initial), null)
  assert.notEqual(initial.variables, seed)
  assert.notEqual(initial.extensions, extensions)
  assert.notEqual(initial.entityState, entityState)
  assert.notEqual(initial.entityState?.owned, entityState.owned)

  for (const state of [initial, cloneState(initial), deserializeState(serializeState(initial))]) {
    assert.equal(Object.getPrototypeOf(state.variables), null)
    assert.equal(Object.getPrototypeOf(state.extensions!), null)
    assert.equal(Object.getPrototypeOf(state.entityState!.extensions!), null)
    assert.equal(Object.hasOwn(state.variables, "value"), true)
    assert.equal(state.variables.value, undefined)
    assert.equal(state.variables.opaqueMap, opaqueMap)
    assert.equal(state.extensions?.opaqueFunction, opaqueFunction)
    assert.equal(state.entityState?.extensions?.opaqueFunction, opaqueFunction)
    assert.equal(state.entityState?.owned.has("item"), true)
  }

  const copy = cloneState(initial)
  assert.notEqual(copy.history, initial.history)
  assert.notEqual(copy.visited, initial.visited)
  assert.notEqual(copy.entityState?.resources, initial.entityState?.resources)

  const visits = new Set(["manual"])
  const history = ["start", "branch"]
  const merged = mergeState(initial, {
    currentNodeId: "start",
    history,
    visited: visits,
    variables: { newField: null, constructor: 1 },
    extensions: { extra: undefined },
  })
  assert.deepEqual(merged.visited, visits)
  assert.notEqual(merged.visited, visits)
  assert.deepEqual(merged.history, history)
  assert.notEqual(merged.history, history)
  assert.equal(merged.variables.newField, null)
  assert.equal(Object.hasOwn(merged.variables, "constructor"), false)
  assert.equal(merged.variables.opaqueMap, opaqueMap)
  assert.equal(Object.hasOwn(merged.extensions!, "extra"), true)
  assert.equal(merged.extensions?.opaqueFunction, opaqueFunction)
  assert.equal(visitCount(merged, "start"), 2)
  assert.equal(hasVisited(merged, "start"), false)
  const navigated = navigateToNode(merged, "next")
  assert.equal(hasVisited(navigated, "next"), true)
  const rewound = backtrack(navigated)!
  assert.equal(rewound.currentNodeId, "start")
  assert.equal(hasVisited(rewound, "next"), true)
  assert.equal(hasVisited(merged, "next"), false)

  assert.equal(setFlag(initial, "__proto__", true), initial)
  assert.equal(setVariable(initial, "constructor", 1), initial)
  assert.equal(incrementVariable(initial, "value", 1), initial)
  assert.equal(addResource(initial, "prototype", 1), initial)
  assert.equal(addResource(initial, "gold", Number.POSITIVE_INFINITY), initial)
  assert.equal(spendResource(initial, "gold", 4), initial)
  assert.equal(spendResource(initial, "gold", -1), initial)
  assert.equal(getResource(spendResource(initial, "gold", 4, { allowNegative: true }), "gold"), -1)
  assert.equal(getResource(spendResource(initial, "gold", 4, { clampToZero: true }), "gold"), 0)
  assert.equal(getResource(addResource(initial, "new", 1), "new"), 1)
  assert.equal(getResource(initial, "gold"), 3)
  assert.equal(getResource(initial, "new"), 0)
}
