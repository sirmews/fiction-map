import { serializeSession, serializeState } from "@fiction-map/runtime"
import { beforeEach, describe, expect, it } from "vitest"
import {
  createGameJournalSession,
  deserializeGameSession,
  forkGameJournalSession,
  fortuneStats,
  gameCapabilities,
  gameContext,
  resetFortuneStats,
  VICTORY_ROUTE,
} from "./journal"

/**
 * Play `transitionIds` on a journal session, returning the final state and
 * every intermediate state (index 0 is the initial state).
 */
function playRoute(
  session: ReturnType<typeof createGameJournalSession>,
  transitionIds: readonly string[],
) {
  let state = session.createState()
  const states = [state]
  for (const id of transitionIds) {
    const context = gameContext(state)
    const available = session.getAvailable(state, context)
    const transition = available.find((t) => t.id === id)
    if (!transition) {
      throw new Error(`transition ${id} not available from ${state.currentNodeId}`)
    }
    const result = session.step(state, transition, context)
    if (!result.success) {
      throw new Error(`transition ${id} failed: ${result.failureReason}`)
    }
    state = result.state
    states.push(state)
  }
  return { state, states }
}

/**
 * Seq of the last entry in each stepIndex group that produced entries —
 * valid fork boundaries. Every `step()` produces at least one fortune entry,
 * so the i-th boundary is the end of the i-th recorded step.
 */
function stepBoundarySeqs(entries: readonly { seq: number; stepIndex: number }[]): number[] {
  const boundaries: number[] = []
  for (let i = 0; i < entries.length; i++) {
    const next = entries[i + 1]
    if (!next || next.stepIndex !== entries[i]!.stepIndex) {
      boundaries.push(entries[i]!.seq)
    }
  }
  return boundaries
}

describe("literature-rpg session journal", () => {
  beforeEach(() => {
    resetFortuneStats()
  })

  it("records a full playthrough: fortune capability journaled, builtins not", () => {
    const session = createGameJournalSession({ mode: "record" })
    const { state } = playRoute(session, VICTORY_ROUTE)

    expect(state.currentNodeId).toBe("victory")
    expect(session.isEnding(state.currentNodeId)).toBe(true)

    const doc = session.serialize()
    expect(doc.format).toBe("fiction-map/journal")
    expect(doc.choices.map((c) => c.transitionId)).toEqual([...VICTORY_ROUTE])
    expect(doc.capabilities.fortune).toEqual(gameCapabilities.fortune)

    // Every journaled exchange is the fortune plugin; builtin types never appear.
    expect(doc.entries.length).toBeGreaterThan(0)
    for (const entry of doc.entries) {
      expect(entry.request.pluginType).toBe("fortuneRoll")
      expect(entry.capability).toBe("fortune")
      expect(entry.requestHash.startsWith("sha256:")).toBe(true)
    }
    // One journal entry per live plugin invocation.
    expect(fortuneStats.invocations).toBe(doc.entries.length)
    // Fortune flavor actually landed in state extensions.
    const fortune = state.extensions?.fortune as { roll: number; flavor: string } | undefined
    expect(fortune).toBeDefined()
    expect(fortune!.roll).toBeGreaterThanOrEqual(1)
    expect(fortune!.roll).toBeLessThanOrEqual(20)
  })

  it("saves via SessionSave, JSON round-trips, and replays identically with zero plugin calls", () => {
    const record = createGameJournalSession({ mode: "record" })
    const { state: finalState } = playRoute(record, VICTORY_ROUTE)

    const save = serializeSession(record, finalState)
    // Full JSON round-trip through the wire format.
    const reparsed = JSON.parse(JSON.stringify(save))

    resetFortuneStats()
    const { session: replay, state: savedState } = deserializeGameSession(reparsed)

    // The save's state snapshot matches the recorded final state.
    expect(serializeState(savedState)).toEqual(serializeState(finalState))

    // Replay the SAME recorded choices.
    const recordedRoute = replay.serialize().choices.map((c) => c.transitionId)
    expect(recordedRoute).toEqual([...VICTORY_ROUTE])
    const { state: replayedFinal } = playRoute(replay, recordedRoute)

    expect(replayedFinal.currentNodeId).toBe("victory")
    expect(serializeState(replayedFinal)).toEqual(serializeState(finalState))
    // Replay served every fortune exchange from the journal: zero live calls.
    expect(fortuneStats.invocations).toBe(0)
  })

  it("forks at a step boundary and replays the divergent branch cleanly", () => {
    const record = createGameJournalSession({ mode: "record" })
    // Record four steps, then fork back to the end of step 2 (main-hall).
    const recordedSteps = VICTORY_ROUTE.slice(0, 4)
    const { states } = playRoute(record, recordedSteps)

    const doc = record.serialize()
    const boundaries = stepBoundarySeqs(doc.entries)
    expect(boundaries.length).toBe(4)
    const atSeq = boundaries[1]!
    const forked = forkGameJournalSession(record, atSeq)
    const forkDoc = forked.serialize()
    expect(forkDoc.forkPoint?.atSeq).toBe(atSeq)
    expect(forkDoc.entries.length).toBe(atSeq + 1)

    // The forked branch diverges at main-hall: take the Archives instead of
    // climbing to the Grand Staircase.
    const divergentRoute = ["explore-archives", "study-heal", "return-from-archives"] as const
    let forkState = states[2]! // state after 2 recorded steps (main-hall)
    for (const id of divergentRoute) {
      const context = gameContext(forkState)
      const available = forked.getAvailable(forkState, context)
      const transition = available.find((t) => t.id === id)
      if (!transition) throw new Error(`divergent transition ${id} not available`)
      const result = forked.step(forkState, transition, context)
      if (!result.success) throw new Error(`divergent transition ${id} failed`)
      forkState = result.state
    }
    expect(forkState.currentNodeId).toBe("main-hall")

    // The fork's journal is the retained prefix plus its own divergent choices.
    const finalForkDoc = forked.serialize()
    expect(finalForkDoc.choices.map((c) => c.transitionId)).toEqual([
      ...VICTORY_ROUTE.slice(0, 2),
      ...divergentRoute,
    ])
    expect(finalForkDoc.forkPoint?.parentHash).toMatch(/^sha256:/)

    // The divergent branch also survives a SessionSave round-trip + replay.
    const forkSave = serializeSession(forked, forkState)
    resetFortuneStats()
    const replayed = deserializeGameSession(JSON.stringify(forkSave))
    const replayRoute = replayed.session.serialize().choices.map((c) => c.transitionId)
    const { state: replayedForkFinal } = playRoute(replayed.session, replayRoute)
    expect(serializeState(replayedForkFinal)).toEqual(serializeState(forkState))
    expect(fortuneStats.invocations).toBe(0)
  })
})
