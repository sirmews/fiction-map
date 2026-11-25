import { describe, expect, it } from "vitest"
import type { GraphBlueprint } from "../adapter"
import { deserializeState, serializeState, setVariable } from "../core/state"
import { builtinEvaluators, builtinHandlers } from "../default-bindings"
import type {
  ConditionEvaluator,
  EffectHandler,
  GraphRuntimeState,
  SerializableState,
} from "../types"
import { extractBlobs, inlineBlobs } from "./blobs"
import { deserializeSession, type SessionSave, serializeSession } from "./save"
import { createJournalSession, ERR_JOURNAL_SCHEMA_MISMATCH } from "./session"
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

function recordSession() {
  const plugins = makePlugins()
  const session = createJournalSession({
    blueprint,
    evaluators: plugins.evaluators,
    handlers: plugins.handlers,
    capabilities,
    mode: "record",
  })
  return { session, plugins }
}

function playPath(
  session: ReturnType<typeof createJournalSession>,
  state: GraphRuntimeState,
  transitionIds: string[],
) {
  for (const id of transitionIds) {
    const available = session.getAvailable(state)
    const transition = available.find((t) => t.id === id)
    if (!transition) throw new Error(`transition ${id} not available`)
    state = session.step(state, transition, {}).state
  }
  return state
}

function cloneSave(save: SessionSave): SessionSave {
  return JSON.parse(JSON.stringify(save)) as SessionSave
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

describe("serializeSession / deserializeSession", () => {
  it("round-trips a recorded session: saved state resumes and replay is identical", () => {
    const { session, plugins: recordPlugins } = recordSession()
    const finalState = playPath(session, session.createState(), ["to-mid", "mid-end"])

    const save = serializeSession(session, finalState)
    expect(save.schemaVersion).toBe(1)
    expect(save.state.schemaVersion).toBe(1)
    expect(save.journal.format).toBe("fiction-map/journal")
    // capabilities mirrors the journal manifest.
    expect(save.capabilities).toEqual(save.journal.capabilities)

    // Survives a JSON round-trip (the real persistence path).
    const wire = cloneSave(save)

    const replayPlugins = makePlugins()
    const { session: replaySession, state } = deserializeSession(wire, {
      blueprint,
      evaluators: replayPlugins.evaluators,
      handlers: replayPlugins.handlers,
      capabilities: wire.capabilities,
      mode: "replay",
    })

    // The saved snapshot is the authoritative resume state.
    expect(serializeState(state)).toEqual(wire.state)
    expect(state.currentNodeId).toBe("end")

    // Replaying the journal from its initial state reproduces the same trace.
    const replayed = playPath(replaySession, deserializeState(wire.journal.session.initialState), [
      "to-mid",
      "mid-end",
    ])
    expect(serializeState(replayed)).toEqual(serializeState(finalState))
    expect(replayPlugins.calls).toEqual({ llmGate: 0, llmMark: 0 })
    expect(recordPlugins.calls.llmGate).toBeGreaterThan(0)
  })

  it("accepts a JSON string and defaults capabilities from the save", () => {
    const { session } = recordSession()
    const finalState = playPath(session, session.createState(), ["to-mid"])
    const save = serializeSession(session, finalState)

    const replayPlugins = makePlugins()
    const { state } = deserializeSession(JSON.stringify(save), {
      blueprint,
      evaluators: replayPlugins.evaluators,
      handlers: replayPlugins.handlers,
      // No capabilities option: falls back to save.capabilities.
      mode: "replay",
    })
    expect(serializeState(state)).toEqual(save.state)
  })

  it("reconstructs a record-continuation session that appends to the journal", () => {
    const { session } = recordSession()
    // Probe availability once so the journal already holds entries.
    session.getAvailable(session.createState())
    const save = serializeSession(session, session.createState())

    const plugins = makePlugins()
    const { session: continued, state: resumed } = deserializeSession(cloneSave(save), {
      blueprint,
      evaluators: plugins.evaluators,
      handlers: plugins.handlers,
      mode: "record",
    })
    const before = continued.serialize().entries.length
    expect(before).toBe(save.journal.entries.length)

    // Continue the session from the saved (initial) state: new exchanges and
    // choices append after the adopted prefix.
    playPath(continued, resumed, ["to-mid", "mid-end"])
    const doc = continued.serialize()
    expect(doc.entries.length).toBeGreaterThan(before)
    expect(doc.choices.map((c) => c.transitionId)).toEqual(["to-mid", "mid-end"])
  })

  it("rejects unsupported save and state schemaVersions", () => {
    const { session } = recordSession()
    const finalState = playPath(session, session.createState(), ["to-mid"])
    const save = serializeSession(session, finalState)

    const badVersion = cloneSave(save)
    badVersion.schemaVersion = 2 as 1
    expectJournalError(
      () => deserializeSession(badVersion, { blueprint, mode: "replay" }),
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )

    const badState = cloneSave(save)
    ;(badState.state as SerializableState).schemaVersion = 99 as 1
    expectJournalError(
      () => deserializeSession(badState, { blueprint, mode: "replay" }),
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )

    const badJournal = cloneSave(save)
    badJournal.journal.formatVersion = 2 as 1
    expectJournalError(
      () => deserializeSession(badJournal, { blueprint, mode: "replay" }),
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  })

  it("replays a blob-extracted journal after inlining", () => {
    const { session } = recordSession()
    const finalState = playPath(session, session.createState(), ["to-mid", "mid-end"])
    const save = serializeSession(session, finalState)

    const doc: JournalDocument = save.journal
    const extracted = extractBlobs(doc, { minBytes: 0 })
    expect(Object.keys(extracted.blobs).length).toBeGreaterThan(0)
    const inlined = inlineBlobs({ ...extracted.document })
    const restored = { ...save, journal: inlined }

    const replayPlugins = makePlugins()
    const { session: replaySession } = deserializeSession(restored, {
      blueprint,
      evaluators: replayPlugins.evaluators,
      handlers: replayPlugins.handlers,
      capabilities: restored.capabilities,
      mode: "replay",
    })
    const replayed = playPath(replaySession, deserializeState(inlined.session.initialState), [
      "to-mid",
      "mid-end",
    ])
    expect(serializeState(replayed)).toEqual(serializeState(finalState))
    expect(replayPlugins.calls).toEqual({ llmGate: 0, llmMark: 0 })
  })
})
