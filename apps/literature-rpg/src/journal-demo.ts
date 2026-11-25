/**
 * Record/replay/fork demo for the literature-rpg session journal.
 *
 * Records a scripted playthrough of the story graph through `JournalSession`
 * (with the non-deterministic `fortuneRoll` plugin), persists it as a
 * `SessionSave` JSON document, replays it identically, and forks a divergent
 * branch. Run with:
 *
 *   bun run journal:demo        (from apps/literature-rpg)
 */

import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { type GraphRuntimeState, serializeSession, serializeState } from "@fiction-map/runtime"
import {
  createGameJournalSession,
  deserializeGameSession,
  forkGameJournalSession,
  fortuneStats,
  gameContext,
  resetFortuneStats,
  VICTORY_ROUTE,
} from "./journal"

const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SAVE_PATH = join(APP_ROOT, ".fiction-map", "session-demo.json")

type GameSession = ReturnType<typeof createGameJournalSession>

function takeStep(
  session: GameSession,
  state: GraphRuntimeState,
  id: string,
  { verbose = true }: { verbose?: boolean } = {},
): GraphRuntimeState {
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
  if (verbose) {
    const fortune = result.state.extensions?.fortune as
      | { roll: number; sides: number; flavor: string }
      | undefined
    console.log(
      `  ${id.padEnd(34)} -> ${result.state.currentNodeId.padEnd(18)}` +
        (fortune ? ` fortune d${fortune.sides} = ${fortune.roll}` : ""),
    )
  }
  return result.state
}

/** Seq of the last entry in each stepIndex group — valid fork boundaries. */
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

function main() {
  // ------------------------------------------------------------------
  // 1. Record a full playthrough to the victory ending
  // ------------------------------------------------------------------
  resetFortuneStats()
  const record = createGameJournalSession({ mode: "record" })
  let state = record.createState()
  const states = [state]
  console.log("Recording playthrough:")
  for (const id of VICTORY_ROUTE) {
    state = takeStep(record, state, id)
    states.push(state)
  }
  const recordDoc = record.serialize()
  console.log(`  ended at ${state.currentNodeId} (ending=${record.isEnding(state.currentNodeId)})`)
  console.log(
    `  journal: ${recordDoc.entries.length} capability entries, ` +
      `${recordDoc.choices.length} choices, ` +
      `${fortuneStats.invocations} fortune plugin invocations`,
  )

  // ------------------------------------------------------------------
  // 2. Save as SessionSave JSON (round-trips through JSON.stringify)
  // ------------------------------------------------------------------
  const save = serializeSession(record, state)
  const json = JSON.stringify(save, null, 2)
  mkdirSync(dirname(SAVE_PATH), { recursive: true })
  writeFileSync(SAVE_PATH, json)
  console.log(`  wrote SessionSave -> ${SAVE_PATH} (${json.length} bytes)`)

  // ------------------------------------------------------------------
  // 3. Replay the recorded choices from the saved JSON
  // ------------------------------------------------------------------
  resetFortuneStats()
  const { session: replay } = deserializeGameSession(json)
  const recordedRoute = replay.serialize().choices.map((c) => c.transitionId)
  let replayState = replay.createState()
  for (const id of recordedRoute) {
    replayState = takeStep(replay, replayState, id, { verbose: false })
  }
  const identical =
    JSON.stringify(serializeState(replayState)) === JSON.stringify(serializeState(state))
  console.log("Replaying recorded choices:")
  console.log(
    `  replay result: ${identical ? "IDENTICAL" : "DIVERGED"} ` +
      `(final node ${replayState.currentNodeId}, ` +
      `fortune invocations during replay: ${fortuneStats.invocations})`,
  )
  if (!identical) {
    process.exitCode = 1
  }

  // ------------------------------------------------------------------
  // 4. Fork at an early boundary and diverge
  // ------------------------------------------------------------------
  const forkAfter = 2 // fork back to the state after 2 steps (main-hall)
  const boundaries = stepBoundarySeqs(recordDoc.entries)
  const forkSeq = boundaries[forkAfter - 1]!
  const forked = forkGameJournalSession(record, forkSeq)
  const forkPrefix = forked.serialize()
  console.log("Forking divergent branch:")
  console.log(
    `  fork at entry seq ${forkSeq}: retained ${forkPrefix.entries.length} entries, ` +
      `${forkPrefix.choices.length} choices, ` +
      `parentHash=${forkPrefix.forkPoint?.parentHash.slice(0, 23)}…`,
  )

  // Live state at the fork boundary = state after `forkAfter` recorded steps.
  let forkState = states[forkAfter]!
  const divergent = ["explore-archives", "study-heal", "return-from-archives"]
  for (const id of divergent) {
    forkState = takeStep(forked, forkState, id)
  }
  const forkDoc = forked.serialize()
  console.log(
    `  divergent branch: ${forkDoc.choices.length} choices total ` +
      `(${forkAfter} shared + ${divergent.length} divergent), ` +
      `final node ${forkState.currentNodeId}`,
  )

  // And the fork itself survives a SessionSave round-trip + replay.
  resetFortuneStats()
  const forkSave = serializeSession(forked, forkState)
  const { session: forkReplay } = deserializeGameSession(JSON.stringify(forkSave))
  const forkRoute = forkReplay.serialize().choices.map((c) => c.transitionId)
  let forkReplayState = forkReplay.createState()
  for (const id of forkRoute) {
    forkReplayState = takeStep(forkReplay, forkReplayState, id, { verbose: false })
  }
  const forkIdentical =
    JSON.stringify(serializeState(forkReplayState)) === JSON.stringify(serializeState(forkState))
  console.log(
    `  fork replay result: ${forkIdentical ? "IDENTICAL" : "DIVERGED"} ` +
      `(fortune invocations during fork replay: ${fortuneStats.invocations})`,
  )
  if (!forkIdentical) {
    process.exitCode = 1
  }
}

main()
