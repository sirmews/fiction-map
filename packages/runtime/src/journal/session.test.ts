import { describe, expect, it } from "vitest"
import type { GraphBlueprint } from "../adapter"
import { deserializeState, serializeState, setVariable } from "../core/state"
import { builtinEvaluators, builtinHandlers } from "../default-bindings"
import type { ConditionEvaluator, EffectHandler, GraphRuntimeState } from "../types"
import {
  createJournalSession,
  ERR_CAPABILITY_MISMATCH,
  ERR_CAPABILITY_UNDECLARED,
  ERR_JOURNAL_DIVERGENCE,
  ERR_JOURNAL_EXHAUSTED,
  ERR_JOURNAL_SCHEMA_MISMATCH,
  type JournalSession,
} from "./session"
import type { CapabilityDeclaration, JournalDocument } from "./types"

const blueprint: GraphBlueprint = {
  nodes: [{ id: "start" }, { id: "mid" }, { id: "alt" }, { id: "end" }],
  edges: [
    {
      id: "to-mid",
      source: "start",
      target: "mid",
      conditions: [{ type: "llmGate" }],
      effects: [{ type: "llmMark" }],
    },
    { id: "start-alt", source: "start", target: "alt" },
    {
      id: "mid-end",
      source: "mid",
      target: "end",
      conditions: [{ type: "hasVariable", key: "mark" }],
    },
    { id: "mid-alt", source: "mid", target: "alt" },
    {
      id: "alt-end",
      source: "alt",
      target: "end",
      effects: [{ type: "setVariable", key: "viaAlt", value: true }],
    },
  ],
  startNode: "start",
  endings: ["end"],
}

const capabilities: Record<string, CapabilityDeclaration> = {
  "llm.test": {
    pluginTypes: ["llmGate", "llmMark"],
    version: "1.0.0",
    reexecutable: false,
    sideEffectFree: false,
  },
}

function makePlugins() {
  const calls = { llmGate: 0, llmMark: 0 }
  const evaluators = new Map<string, ConditionEvaluator>(builtinEvaluators)
  const handlers = new Map<string, EffectHandler>(builtinHandlers)
  evaluators.set("llmGate", () => {
    calls.llmGate += 1
    return true
  })
  handlers.set("llmMark", (state) => {
    calls.llmMark += 1
    return setVariable(state, "mark", calls.llmMark)
  })
  return { evaluators, handlers, calls }
}

function sessionOptions(mode: "record" | "replay" | "off", journal?: JournalDocument) {
  const plugins = makePlugins()
  return {
    plugins,
    options: {
      blueprint,
      evaluators: plugins.evaluators,
      handlers: plugins.handlers,
      capabilities,
      mode,
      journal,
    },
  }
}

function playFrom(session: JournalSession, state: GraphRuntimeState, transitionIds: string[]) {
  for (const id of transitionIds) {
    const available = session.getAvailable(state)
    const transition = available.find((t) => t.id === id)
    if (!transition) throw new Error(`transition ${id} not available`)
    state = session.step(state, transition, {}).state
  }
  return state
}

function play(session: JournalSession, transitionIds: string[]) {
  return playFrom(session, session.createState(), transitionIds)
}

function cloneDoc(doc: JournalDocument): JournalDocument {
  return JSON.parse(JSON.stringify(doc)) as JournalDocument
}

function expectJournalError(fn: () => unknown, code: string) {
  try {
    fn()
  } catch (error) {
    expect((error as { code?: string }).code).toBe(code)
    return
  }
  throw new Error(`expected error ${code}`)
}

describe("JournalSession", () => {
  it("records capability exchanges and choices, then replays with zero plugin calls", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    const finalState = play(session, ["to-mid", "mid-end"])

    const doc = session.serialize()
    expect(doc.format).toBe("fiction-map/journal")
    expect(doc.formatVersion).toBe(1)
    expect(doc.entries.length).toBeGreaterThan(0)
    expect(doc.choices.map((c) => c.transitionId)).toEqual(["to-mid", "mid-end"])
    // Only declared plugin types are journaled; builtins never appear.
    for (const entry of doc.entries) {
      expect(["llmGate", "llmMark"]).toContain(entry.request.pluginType)
      expect(entry.capability).toBe("llm.test")
      expect(entry.requestHash.startsWith("sha256:")).toBe(true)
    }
    // The counter-based handler produced a recorded, non-constant value.
    const markValues = doc.entries
      .filter((e) => e.request.pluginType === "llmMark")
      .map((e) => (e.response as { variables: { mark: number } }).variables.mark)
    expect(markValues.length).toBeGreaterThan(0)
    expect(new Set(markValues).size).toBe(markValues.length)

    const replay = sessionOptions("replay", doc)
    const replaySession = createJournalSession(replay.options)
    const replayed = play(replaySession, ["to-mid", "mid-end"])

    expect(serializeState(replayed)).toEqual(serializeState(finalState))
    expect(replay.plugins.calls).toEqual({ llmGate: 0, llmMark: 0 })
  })

  it("detects tampering with a recorded entry as ERR_JOURNAL_DIVERGENCE", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    play(session, ["to-mid"])
    const doc = cloneDoc(session.serialize())
    doc.entries[0]!.stateFingerprint = "tampered"

    const replay = sessionOptions("replay", doc)
    const replaySession = createJournalSession(replay.options)
    expectJournalError(() => play(replaySession, ["to-mid"]), ERR_JOURNAL_DIVERGENCE)
  })

  it("detects a divergent choice as ERR_JOURNAL_DIVERGENCE", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    play(session, ["to-mid", "mid-end"])
    const doc = cloneDoc(session.serialize())

    const replay = sessionOptions("replay", doc)
    const replaySession = createJournalSession(replay.options)
    // Same prefix, different second transition.
    expectJournalError(() => play(replaySession, ["to-mid", "mid-alt"]), ERR_JOURNAL_DIVERGENCE)
  })

  it("throws ERR_JOURNAL_EXHAUSTED when replay runs past the recorded end", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    play(session, ["to-mid"])
    const doc = session.serialize()

    const replay = sessionOptions("replay", doc)
    const replaySession = createJournalSession(replay.options)
    play(replaySession, ["to-mid"])
    // Another capability probe at `start` has no recorded entry left.
    expectJournalError(
      () => replaySession.getAvailable(replaySession.createState()),
      ERR_JOURNAL_EXHAUSTED,
    )
  })

  it("rejects unknown journal formats with ERR_JOURNAL_SCHEMA_MISMATCH", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    play(session, ["to-mid"])
    const doc = cloneDoc(session.serialize())
    doc.formatVersion = 2 as 1

    const replay = sessionOptions("replay", doc)
    expectJournalError(() => createJournalSession(replay.options), ERR_JOURNAL_SCHEMA_MISMATCH)
  })

  it("rejects capability version drift with ERR_CAPABILITY_MISMATCH", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    play(session, ["to-mid"])
    const doc = session.serialize()

    const replay = sessionOptions("replay", doc)
    replay.options.capabilities = {
      "llm.test": { ...capabilities["llm.test"]!, version: "2.0.0" },
    }
    expectJournalError(() => createJournalSession(replay.options), ERR_CAPABILITY_MISMATCH)
  })

  it("throws ERR_CAPABILITY_UNDECLARED for undeclared custom plugins", () => {
    const plugins = makePlugins()
    plugins.evaluators.set("mystery", () => true)
    const mysteryBlueprint: GraphBlueprint = {
      ...blueprint,
      edges: blueprint.edges.map((edge) =>
        edge.id === "to-mid" ? { ...edge, conditions: [{ type: "mystery" }] } : edge,
      ),
    }
    const mystery = createJournalSession({
      blueprint: mysteryBlueprint,
      evaluators: plugins.evaluators,
      handlers: plugins.handlers,
      capabilities,
      mode: "record",
    })
    expectJournalError(() => mystery.getAvailable(mystery.createState()), ERR_CAPABILITY_UNDECLARED)
  })

  it("passes undeclared plugins through in off mode without journaling", () => {
    const plugins = makePlugins()
    plugins.evaluators.set("mystery", () => true)
    const mysteryBlueprint: GraphBlueprint = {
      ...blueprint,
      edges: blueprint.edges.map((edge) =>
        edge.id === "to-mid" ? { ...edge, conditions: [{ type: "mystery" }] } : edge,
      ),
    }
    const session = createJournalSession({
      blueprint: mysteryBlueprint,
      evaluators: plugins.evaluators,
      handlers: plugins.handlers,
      capabilities,
      mode: "off",
    })
    const state = play(session, ["to-mid", "mid-alt", "alt-end"])
    expect(state.currentNodeId).toBe("end")
    const doc = session.serialize()
    expect(doc.entries).toHaveLength(0)
    expect(doc.choices).toHaveLength(0)
  })

  it("forks at a step boundary and replays divergent branches cleanly", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)

    let state = session.createState()
    state = session.step(
      state,
      session.getAvailable(state).find((t) => t.id === "to-mid")!,
      {},
    ).state

    const doc = session.serialize()
    const atSeq = doc.entries.length - 1
    const forked = session.fork(atSeq)
    expect(forked.serialize().forkPoint?.atSeq).toBe(atSeq)
    expect(forked.serialize().entries).toHaveLength(atSeq + 1)

    // Original branch continues to `end` via mid-end.
    const originalFinal = playFrom(session, state, ["mid-end"])
    // Forked branch diverges through alt.
    const forkFinal = playFrom(forked, state, ["mid-alt", "alt-end"])

    const originalDoc = session.serialize()
    const forkDoc = forked.serialize()
    expect(originalDoc.choices.map((c) => c.transitionId)).toEqual(["to-mid", "mid-end"])
    expect(forkDoc.choices.map((c) => c.transitionId)).toEqual(["to-mid", "mid-alt", "alt-end"])
    expect(forkDoc.forkPoint?.parentHash).toMatch(/^sha256:/)

    // Both branches replay with zero plugin invocations.
    const replayOriginal = sessionOptions("replay", originalDoc)
    const originalReplay = createJournalSession(replayOriginal.options)
    const replayedOriginal = play(originalReplay, ["to-mid", "mid-end"])
    expect(serializeState(replayedOriginal)).toEqual(serializeState(originalFinal))
    expect(replayOriginal.plugins.calls).toEqual({ llmGate: 0, llmMark: 0 })

    const replayFork = sessionOptions("replay", forkDoc)
    const forkReplay = createJournalSession(replayFork.options)
    const replayedFork = play(forkReplay, ["to-mid", "mid-alt", "alt-end"])
    expect(serializeState(replayedFork)).toEqual(serializeState(forkFinal))
    expect(replayFork.plugins.calls).toEqual({ llmGate: 0, llmMark: 0 })
    expect(replayedFork.variables.viaAlt).toBe(true)
  })

  it("replays a recorded walk with zero plugin invocations", () => {
    const record = sessionOptions("record")
    const session = createJournalSession(record.options)
    const steps = session.walk(session.createState())
    expect(steps.at(-1)?.state.currentNodeId).toBe("end")

    const doc = session.serialize()
    const replay = sessionOptions("replay", doc)
    const replaySession = createJournalSession(replay.options)
    const replaySteps = replaySession.walk(deserializeState(doc.session.initialState))
    expect(replaySteps.map((s) => s.nodeId)).toEqual(steps.map((s) => s.nodeId))
    expect(replay.plugins.calls).toEqual({ llmGate: 0, llmMark: 0 })
  })
})
