/**
 * Session-journal integration for the literature-rpg story graph.
 *
 * This module wires the Phase 1+2 journal API (`JournalSession`,
 * `SessionSave`) around the same `story` graph that `main.ts` runs on the
 * plain `GraphRuntime`. Because `JournalSession` builds its own runtime
 * internally, it cannot wrap `main.ts`'s `runtime` — instead we derive the
 * identical `GraphBlueprint` via `graphDefinitionToBlueprint(story)` and
 * re-register the same five global triggers on the session.
 *
 * To prove capability journaling end-to-end we add one genuinely
 * non-deterministic custom plugin: the `fortuneRoll` effect. It is declared
 * with `reexecutable: false, sideEffectFree: false`, so every invocation is
 * recorded as a `JournalEntry` in record mode and served from the journal
 * (zero plugin calls) in replay mode. All graph conditions/effects are
 * builtin types and are never journaled.
 */

import {
  builtinEvaluators,
  builtinHandlers,
  type CapabilityDeclaration,
  type ConditionEvaluator,
  canonicalStringify,
  cloneState,
  createJournalSession,
  type DeserializedSession,
  deriveEntityState,
  deserializeSession,
  type EffectContext,
  type EffectHandler,
  type EvaluationContext,
  type GraphRuntimeState,
  graphDefinitionToBlueprint,
  type JournalDocument,
  type JournalMode,
  type JournalSession,
  registerBuiltins,
  type SerializableState,
  type SessionSave,
  type StateTrigger,
  sha256Prefixed,
} from "@fiction-map/runtime"
import { globalTriggers } from "./global-triggers"
import { story } from "./graphs/story.graph"
import { registry } from "./project"
import { world } from "./world"

registerBuiltins(registry)

/**
 * The same blueprint `createRuntimeFromGraph(story)` builds internally.
 */
export const storyBlueprint = graphDefinitionToBlueprint(story)

/**
 * Content hash of the blueprint, recorded as `session.graphVersion` so a
 * journal is pinned to the exact graph it was recorded against.
 */
export const storyGraphVersion = sha256Prefixed(canonicalStringify(storyBlueprint))

// ---------------------------------------------------------------------------
// Custom plugin: fortuneRoll (the demo capability)
// ---------------------------------------------------------------------------

/**
 * Live invocation counter for the fortune plugin. Tests and the demo script
 * reset this to prove replay performs zero plugin invocations.
 */
export const fortuneStats = { invocations: 0 }

export function resetFortuneStats(): void {
  fortuneStats.invocations = 0
}

const FORTUNE_FLAVORS = [
  "The cards favor you.",
  "Fortune is neutral.",
  "The dice land edge-on.",
  "A chill of luck runs down your spine.",
  "The runes spell out a warning.",
  "Somewhere, a bell tolls.",
] as const

/**
 * Genuinely non-deterministic effect handler (`Math.random`). Writes flavor
 * text into `state.extensions.fortune`. Because it mutates external entropy
 * and is not side-effect free, the journal records every call and replay
 * never re-invokes it.
 */
export const fortuneRollHandler: EffectHandler = (state, effect) => {
  fortuneStats.invocations += 1
  const rawSides = typeof effect.sides === "number" ? effect.sides : 20
  const sides = Number.isFinite(rawSides) && rawSides > 0 ? Math.floor(rawSides) : 20
  const roll = 1 + Math.floor(Math.random() * sides)
  const next = cloneState(state)
  next.extensions = {
    ...(next.extensions ?? {}),
    fortune: {
      roll,
      sides,
      flavor: FORTUNE_FLAVORS[(roll - 1) % FORTUNE_FLAVORS.length],
      nodeId: state.currentNodeId,
      invocation: fortuneStats.invocations,
    },
  }
  return next
}

export const gameCapabilities: Record<string, CapabilityDeclaration> = {
  fortune: {
    pluginTypes: ["fortuneRoll"],
    version: "1.0.0",
    reexecutable: false,
    sideEffectFree: false,
    source: { kind: "stub-rng", note: "Math.random d20; journal demo capability" },
  },
}

// ---------------------------------------------------------------------------
// Plugin maps: builtins (copied, never mutated) + the fortune plugin
// ---------------------------------------------------------------------------

export const gameEvaluators: Map<string, ConditionEvaluator> = new Map(builtinEvaluators)

export const gameHandlers: Map<string, EffectHandler> = new Map(builtinHandlers)
gameHandlers.set("fortuneRoll", fortuneRollHandler)

// ---------------------------------------------------------------------------
// Triggers: the shared global set plus the fortune trigger
// ---------------------------------------------------------------------------

const fortuneTrigger: StateTrigger = {
  id: "fortune-trigger",
  conditions: [],
  effects: [{ type: "fortuneRoll" }],
}

/**
 * Trigger list applied to every journal session: the shared `globalTriggers`
 * from `global-triggers.ts` (same five globals as `main.ts`) plus
 * `fortune-trigger`, which fires once per `step()` (conditions are empty)
 * and produces one journaled capability exchange per step.
 */
export const gameTriggers: readonly StateTrigger[] = [...globalTriggers, fortuneTrigger]

// ---------------------------------------------------------------------------
// Session factories
// ---------------------------------------------------------------------------

export interface GameJournalSessionOptions {
  /** Defaults to `"record"`. */
  mode?: JournalMode
  /** Existing journal to adopt/continue (record) or replay from (replay). */
  journal?: JournalDocument | null
  initialState?: GraphRuntimeState | SerializableState
  createdAt?: string
}

/**
 * Build a `JournalSession` for the literature-rpg story graph with the game's
 * plugin maps, capability manifest, and global triggers registered.
 */
export function createGameJournalSession(options: GameJournalSessionOptions = {}): JournalSession {
  const session = createJournalSession({
    blueprint: storyBlueprint,
    evaluators: gameEvaluators,
    handlers: gameHandlers,
    capabilities: gameCapabilities,
    mode: options.mode ?? "record",
    journal: options.journal ?? null,
    graphId: story.id,
    graphVersion: storyGraphVersion,
    initialState: options.initialState,
    createdAt: options.createdAt,
  })
  for (const trigger of gameTriggers) {
    session.addTrigger(trigger)
  }
  return session
}

/**
 * Rebuild a session + live state from a `SessionSave` (object or JSON
 * string), then re-register the game triggers — the journal does not store
 * triggers, so replay must attach the same set before stepping.
 */
export function deserializeGameSession(
  save: SessionSave | string,
  options: { mode?: JournalMode } = {},
): DeserializedSession {
  const parsed: SessionSave = typeof save === "string" ? JSON.parse(save) : save
  const { session, state } = deserializeSession(parsed, {
    blueprint: storyBlueprint,
    evaluators: gameEvaluators,
    handlers: gameHandlers,
    // Pass the app's own declarations (not the save's copy) so replay
    // validates the live manifest against the recorded one.
    capabilities: gameCapabilities,
    mode: options.mode ?? "replay",
    graphId: story.id,
  })
  for (const trigger of gameTriggers) {
    session.addTrigger(trigger)
  }
  return { session, state }
}

/**
 * Fork a game journal session at an entry boundary. `JournalSession.fork()`
 * inherits the parent's triggers (they are runtime registrations carried
 * with the session lineage), so no re-attachment is needed — unlike
 * `deserializeGameSession`, which must re-register them explicitly.
 */
export function forkGameJournalSession(session: JournalSession, atSeq: number): JournalSession {
  return session.fork(atSeq)
}

/**
 * Evaluation/effect context matching what `main.ts` / `main.test.ts` pass to
 * the plain runtime (`derivedState` from the world).
 */
export function gameContext(state: GraphRuntimeState): EvaluationContext & EffectContext {
  return { derivedState: deriveEntityState(world, state) }
}

// ---------------------------------------------------------------------------
// Demo route: the East-wing victory path from main.test.ts
// ---------------------------------------------------------------------------

/**
 * Scripted transition ids for a full playthrough to `victory`, shared by the
 * journal test and the record/replay demo script.
 */
export const VICTORY_ROUTE: readonly string[] = [
  "enter-entrance",
  "enter-hall",
  "climb-staircase",
  "go-west",
  "align-telescope",
  "return-to-stairs-from-observatory",
  "go-east",
  "go-to-armory",
  "take-shield",
  "take-iron-key",
  "return-to-gallery-from-armory",
  "place-shield",
  "walk-past-statues-safely",
  "drink-spirit-elixir",
  "answer-riddle",
  "drink-spirit-elixir-crypt",
  "unlock-casket",
]
