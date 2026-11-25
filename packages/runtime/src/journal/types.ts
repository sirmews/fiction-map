/**
 * Session journal types — the deterministic replay record for a Session.
 *
 * See docs/decisions/2026-11-25-session-journal-replay.md and
 * docs/plans/session-journal-implementation.md. The journal is external to
 * state: it records every non-builtin capability exchange plus the choices
 * that drove the session, so a session can be replayed without re-invoking
 * plugins.
 */

import type { SerializableState } from "../types"

export const JOURNAL_FORMAT = "fiction-map/journal" as const
export const JOURNAL_FORMAT_VERSION = 1 as const

export type JournalMode = "record" | "replay" | "off"

/**
 * Static contract for a plugin capability. Recorded once in the journal
 * manifest; replay validates registered plugins against it.
 */
export interface CapabilityDeclaration {
  /** Registered plugin type(s) this capability covers, e.g. "llmNarrate". */
  pluginTypes: string[]
  version: string
  /**
   * May be re-invoked during replay. Only honored together with
   * `sideEffectFree`; otherwise the capability is always journaled.
   */
  reexecutable: boolean
  /** No mutation of external systems; safe to call speculatively. */
  sideEffectFree: boolean
  /** Non-determinism source pinning: model id, seed, params. */
  source?: Record<string, unknown>
}

/**
 * One capability exchange. `request`/`response` are opaque to the engine:
 * `request` is `{pluginType, kind, args}` and `response` is the raw plugin
 * return value — a boolean for condition evaluators, a
 * `SerializableState` for effect handlers.
 */
export interface JournalEntry {
  seq: number
  /** Index of the top-level session operation that produced this exchange. */
  stepIndex: number
  /** SymbolicState fingerprint of the state the plugin was invoked with. */
  stateFingerprint: string
  capability: string
  /** `"sha256:"` + hex of the canonical request payload. */
  requestHash: string
  request: {
    pluginType: string
    kind: "condition" | "effect"
    args: unknown
  }
  response: unknown
  durationMs: number
}

/** A non-plugin decision input: which transition was picked per step. */
export interface JournalChoice {
  seq: number
  stepIndex: number
  transitionId: string
  stateFingerprint: string
}

export interface JournalCheckpoint {
  stepIndex: number
  state: SerializableState
  entrySeq: number
}

export interface JournalForkPoint {
  /** `"sha256:"` + hex of the canonical JSON of the retained prefix. */
  parentHash: string
  atSeq: number
}

export interface JournalDocument {
  format: typeof JOURNAL_FORMAT
  formatVersion: typeof JOURNAL_FORMAT_VERSION
  session: {
    graphId?: string
    graphVersion?: string
    createdAt: string
    initialState: SerializableState
  }
  capabilities: Record<string, CapabilityDeclaration>
  entries: JournalEntry[]
  choices: JournalChoice[]
  checkpoints?: JournalCheckpoint[]
  forkPoint?: JournalForkPoint
}
