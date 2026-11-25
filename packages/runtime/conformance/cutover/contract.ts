import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ProjectRegistry } from "@fiction-map/core"
import {
  builtinEvaluators,
  builtinHandlers,
  checkTransitionAvailability,
  deriveEntityState,
  deserializeState,
  type EffectContext,
  type EvaluationContext,
  GraphRuntime,
  type GraphRuntimeState,
  RuntimeError,
  registerBuiltins,
  type SerializableState,
  type StepResult,
  serializeState,
  type TransitionResult,
  validateGraphSemantics,
} from "@fiction-map/runtime"
import { runtime as game } from "../../../../apps/literature-rpg/src/main"
import { world } from "../../../../apps/literature-rpg/src/world"
import { checkEntitiesContract } from "./entities-contract"
import { checkStateContract } from "./state-contract"

const readFixture = <T>(name: string): T =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"))

function summarizeResult({ state, ...result }: TransitionResult) {
  return { ...result, state: serializeState(state) }
}

function gameplay() {
  const entry = game.createState()
  const entrance = game.getAvailable(entry)[0]
  const first = game.step(entry, entrance, { derivedState: deriveEntityState(world, entry) })
  const context = { derivedState: deriveEntityState(world, first.state) }
  const enterHall = game.getAvailable(first.state, context).find(({ id }) => id === "enter-hall")!
  const second = game.step(first.state, enterHall, context)
  const { available, blocked, hidden } = game.getByAvailability(second.state, {
    derivedState: deriveEntityState(world, second.state),
  })
  return {
    first: summarizeResult(first),
    second: summarizeResult(second),
    available: available.map(({ id }) => id),
    blocked: blocked.map(({ id }) => id),
    hidden: hidden.map(({ id }) => id),
  }
}

function transitionOutcomes() {
  const runtime = new GraphRuntime({
    nodes: [{ id: "start" }, { id: "end" }, { id: "fallback", autoResolve: true }],
    edges: [
      {
        id: "hidden",
        source: "start",
        target: "end",
        visibility: [{ type: "hasFlag", key: "show" }],
      },
      {
        id: "blocked",
        source: "start",
        target: "end",
        conditions: [{ type: "hasFlag", key: "key" }],
        failureTarget: "fallback",
        failureEffects: [
          { type: "setVariable", key: "score", value: 2 },
          { type: "increment", key: "score", delta: 3 },
        ],
      },
      { id: "stay", source: "start", effects: [{ type: "setFlag", key: "stayed", value: true }] },
      { id: "auto", source: "fallback", target: "end" },
    ],
  })
  runtime.addTrigger({
    id: "trigger",
    conditions: [],
    effects: [{ type: "setFlag", key: "trigger", value: true }],
  })
  const state = runtime.createState()
  const [hidden, blocked, stay] = runtime.transitions
  const grouped = runtime.getByAvailability(state)
  assert.equal(grouped.available[0], stay)
  assert.equal(grouped.blocked[0], blocked)
  assert.equal(grouped.hidden[0], hidden)
  const hiddenResult = runtime.step(state, hidden)
  assert.equal(hiddenResult.state, state)
  return {
    hidden: summarizeResult(hiddenResult),
    blocked: summarizeResult(runtime.step(state, blocked)),
    stay: summarizeResult(runtime.step(state, stay)),
    availability: checkTransitionAvailability(state, blocked, builtinEvaluators),
    original: serializeState(state),
  }
}

function walking() {
  const runtime = new GraphRuntime(
    {
      nodes: [{ id: "start" }, { id: "next" }, { id: "end" }],
      edges: [
        { id: "go", source: "start", target: "next" },
        { id: "else", source: "start", target: "end" },
        { id: "finish", source: "next", target: "end", conditions: [{ type: "atContextNode" }] },
      ],
    },
    new Map([
      ["atContextNode", (state, _condition, context) => state.currentNodeId === context?.node],
    ]),
  )
  const summarize = (steps: StepResult[]) =>
    steps.map(({ nodeId, available, applied, state }) => ({
      nodeId,
      available: available.map(({ id }) => id),
      applied: applied?.nextNodeId ?? null,
      sharesAppliedState: state === applied?.state,
      history: state.history,
    }))
  const initial = runtime.createState()
  const contextNodes: string[] = []
  const withContext = runtime.walkWithContext(initial, (state) => {
    contextNodes.push(state.currentNodeId)
    return { node: state.currentNodeId }
  })
  const loop = new GraphRuntime({
    nodes: [{ id: "start" }],
    edges: [{ id: "repeat", source: "start", target: "start" }],
  })
  return {
    withContext: summarize(withContext),
    contextNodes,
    static: summarize(runtime.walk(initial, 100, { node: "start" })),
    depthLimited: summarize(runtime.walk(initial, 1, { node: "next" })),
    emptyLimit: runtime.walk(initial, 0),
    cycle: summarize(loop.walk(loop.createState())),
  }
}

function validation() {
  const invalid = new GraphRuntime({
    nodes: [{ id: "start" }, { id: "orphan" }],
    edges: [{ id: "broken", source: "start", target: "missing", failureTarget: "other" }],
  })
  const { reachableNodes, ...staticResult } = invalid.validate()
  const runtime = new GraphRuntime({
    nodes: [{ id: "start" }, { id: "stuck" }, { id: "end" }, { id: "death" }],
    endings: ["end", "death"],
    edges: [
      { id: "win", source: "start", target: "end" },
      { id: "trap", source: "start", target: "stuck" },
      { id: "die", source: "start", target: "death" },
      {
        id: "locked",
        source: "stuck",
        target: "end",
        conditions: [{ type: "hasFlag", key: "key" }],
      },
    ],
  })
  return {
    static: { ...staticResult, reachableNodes: [...reachableNodes] },
    semantic: validateGraphSemantics(runtime, world),
    limited: validateGraphSemantics(runtime, world, { maxSteps: 1 }),
  }
}

function persistence() {
  const save = readFixture<SerializableState>("save-v1.json")
  const state = deserializeState(save)
  assert(state.visited instanceof Set)
  assert(state.entityState?.owned instanceof Set)
  assert(state.entityState?.active instanceof Set)
  assert(state.entityState?.unlocked instanceof Set)
  assert.equal(Object.getPrototypeOf(state.variables), null)
  assert.equal(Object.getPrototypeOf(state.flags), null)
  assert.equal(Object.getPrototypeOf(state.extensions!), null)
  assert.equal(Object.getPrototypeOf(state.entityState!.resources), null)
  assert.notEqual(state.history, save.history)
  const serialized = serializeState(state)
  assert.equal(Object.hasOwn(serialized.variables, "__proto__"), false)
  assert.equal(Object.hasOwn(serialized.variables, "constructor"), false)
  assert.equal(Object.hasOwn(serialized.entityState!.resources, "prototype"), false)
  assert.equal(serialized.variables.note, save.variables.note)
  assert.throws(
    () => deserializeState({ ...save, schemaVersion: 99 } as unknown as SerializableState),
    (error: unknown) =>
      error instanceof RuntimeError &&
      error.code === "ERR_RUNTIME_SCHEMA_MISMATCH" &&
      error.message ===
        "Unsupported save schemaVersion: 99. Current version is 1. Migrate the data before calling deserializeState.",
  )
  const context = { derivedState: deriveEntityState(world, state) }
  const transition = game.getAvailable(state, context).find(({ id }) => id === "enter-hall")!
  return { serialized, resumed: summarizeResult(game.step(state, transition, context)) }
}

function callbacksAndMutation() {
  const opaque = Symbol("opaque callback payload")
  const registry = new ProjectRegistry()
  const otherRegistry = new ProjectRegistry()
  registerBuiltins(registry)
  const equals = registry.conditions.get("equals")
  assert(equals)
  registerBuiltins(registry)
  assert.equal(registry.conditions.get("equals"), equals)
  assert.equal(otherRegistry.conditions.size, 0)
  assert.equal(otherRegistry.effects.size, 0)

  const originalContext = { registry, opaque, scope: "test" }
  const visibility = { type: "custom", name: "visibility" }
  const requirement = { type: "custom", name: "requirement" }
  const enter = { type: "log", name: "enter" }
  const first = { type: "log", name: "first" }
  const second = { type: "log", name: "second" }
  const afterTrigger = { type: "log", name: "trigger" }
  const auto = { type: "log", name: "auto" }

  const events: unknown[][] = []
  const evaluators = new Map(builtinEvaluators)
  const handlers = new Map(builtinHandlers)
  const runtime = new GraphRuntime(
    {
      nodes: [{ id: "start" }, { id: "compute" }, { id: "end" }],
      edges: [
        {
          id: "play",
          source: "start",
          target: "compute",
          visibility: [visibility],
          conditions: [requirement],
          effects: [first, { type: "increment", key: "count", delta: 3 }, second],
        },
      ],
      endings: [],
    },
    evaluators,
    handlers,
  )
  const transitions = runtime.transitions
  const nodes = runtime.nodes
  const endings = runtime.endingNodeIds
  const triggers = runtime.triggers
  assert.equal(runtime.transitions, transitions)
  assert.equal(runtime.nodes, nodes)
  assert.equal(runtime.endingNodeIds, endings)
  assert.equal(runtime.triggers, triggers)
  endings.add("end")
  assert.equal(runtime.isEnding("end"), true)
  nodes.get("compute")!.autoResolve = true
  nodes.get("compute")!.enterEffects = [enter]
  transitions.push({
    id: "auto",
    sourceNodeId: "compute",
    targetNodeId: "end",
    effects: [auto],
  })
  triggers.push({
    id: "after-play",
    conditions: [{ type: "custom", name: "trigger" }],
    effects: [afterTrigger],
  })

  const initial = runtime.createState({ count: 1, opaque }, { opaque })
  const conditions = [visibility, requirement, triggers[0].conditions[0]]
  const effects = [first, second, enter, afterTrigger, auto]
  const checkContext = (context: EvaluationContext | EffectContext | undefined) => {
    assert(context)
    assert.notEqual(context, originalContext)
    assert.equal(context.registry, registry)
    assert.equal(context.scope, originalContext.scope)
    assert.equal(context.opaque, opaque)
  }
  const lastStates: GraphRuntimeState[] = []
  const contexts: Array<EvaluationContext | EffectContext | undefined> = []
  evaluators.set("custom", (state, condition, context) => {
    assert(conditions.includes(condition as typeof visibility))
    checkContext(context)
    assert.equal(state.variables.opaque, opaque)
    assert.equal(state.extensions?.opaque, opaque)
    events.push([
      condition.name,
      state.currentNodeId,
      state.variables.count,
      state === initial,
      !!context?.trace,
    ])
    contexts.push(context)
    return true
  })
  handlers.set("log", (state, effect, context) => {
    assert(effects.includes(effect as typeof first))
    checkContext(context)
    assert.equal(state.variables.opaque, opaque)
    assert.equal(state.extensions?.opaque, opaque)
    const count = Number(state.variables.count)
    events.push([effect.name, state.currentNodeId, count, state === initial, !!context?.trace])
    contexts.push(context)
    const updated = { ...state, variables: { ...state.variables, count: count * 2 } }
    lastStates.push(updated)
    return updated
  })
  const result = runtime.step(initial, transitions[0], originalContext)
  assert.equal(contexts[0], contexts[1])
  assert.equal(contexts[0], contexts[2])
  assert.equal(contexts[0], contexts[3])
  assert.equal(contexts[4], contexts[5])
  assert.notEqual(contexts[4], contexts[6])
  assert.notEqual(contexts[6], contexts[7])
  assert.equal(result.state.variables.opaque, opaque)
  assert.equal(result.state.extensions?.opaque, opaque)
  assert.equal(result.trace?.effectsApplied[0].effect, first)
  assert.equal(initial.variables.count, 1)
  assert.equal(lastStates.at(-1)?.currentNodeId, "compute")
  assert.equal(Object.hasOwn(originalContext, "trace"), false)
  return { events, result: summarizeResult(result) }
}

checkStateContract()
checkEntitiesContract()

const observed = JSON.parse(
  JSON.stringify({
    gameplay: gameplay(),
    transitionOutcomes: transitionOutcomes(),
    walking: walking(),
    validation: validation(),
    persistence: persistence(),
    callbacksAndMutation: callbacksAndMutation(),
  }),
)

if (process.argv.includes("--print-observations")) {
  console.log(JSON.stringify(observed, null, 2))
} else {
  const expected = readFixture<Record<string, unknown>>("expected.json")
  for (const [name, result] of Object.entries(observed)) {
    assert.deepEqual(result, expected[name], name)
  }
  assert.deepEqual(Object.keys(observed), Object.keys(expected))
  console.log("Runtime cutover contract passed.")
}
