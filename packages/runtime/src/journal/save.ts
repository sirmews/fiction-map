import { RuntimeError } from "@fiction-map/core"
import type { GraphBlueprint } from "../adapter"
import { deserializeState, serializeState } from "../core/state"
import type {
  ConditionEvaluator,
  EffectHandler,
  GraphRuntimeState,
  SerializableState,
} from "../types"
import { SERIALIZATION_SCHEMA_VERSION } from "../types"
import {
  createJournalSession,
  ERR_JOURNAL_SCHEMA_MISMATCH,
  type JournalSession,
  type JournalSessionOptions,
} from "./session"
import type { CapabilityDeclaration, JournalDocument, JournalMode } from "./types"

/**
 * Session save composition (plan §6): a `SerializableState` snapshot plus the
 * full `JournalDocument` and capability manifest, as one JSON document.
 *
 * The state snapshot is authoritative for resuming play in `"record"`
 * mode; the journal is the replay/branch record. `capabilities` mirrors
 * `journal.capabilities` so a
 * save is self-describing — `deserializeSession` can feed it straight back
 * into `JournalSessionOptions.capabilities`.
 */

export const SESSION_SAVE_SCHEMA_VERSION = 1 as const

export interface SessionSave {
  schemaVersion: typeof SESSION_SAVE_SCHEMA_VERSION
  state: SerializableState
  journal: JournalDocument
  capabilities: Record<string, CapabilityDeclaration>
}

export function serializeSession(session: JournalSession, state: GraphRuntimeState): SessionSave {
  const journal = session.serialize()
  return {
    schemaVersion: SESSION_SAVE_SCHEMA_VERSION,
    state: serializeState(state),
    journal,
    capabilities: { ...journal.capabilities },
  }
}

export interface DeserializeSessionOptions {
  blueprint: GraphBlueprint
  /** Defaults to `builtinEvaluators`, matching `JournalSession`. */
  evaluators?: Map<string, ConditionEvaluator>
  /** Defaults to `builtinHandlers`, matching `JournalSession`. */
  handlers?: Map<string, EffectHandler>
  /**
   * Capability declarations. Required for `"replay"` (validated against the
   * journal manifest); optional for `"record"` continuation, which adopts
   * the journal's own manifest when omitted. `save.capabilities` is the
   * natural value to pass.
   */
  capabilities?: JournalSessionOptions["capabilities"]
  /**
   * Session mode to reconstruct. `"replay"` (default) serves recorded
   * exchanges; `"record"` continues the journal from its current end;
   * `"off"` ignores the journal entirely.
   */
  mode?: JournalMode
  graphId?: string
  graphVersion?: string
  createdAt?: string
}

export interface DeserializedSession {
  session: JournalSession
  /**
   * The saved live state. Continue playing from it in `"record"` mode
   * (the journal keeps appending). In `"replay"` mode the cursors start at
   * the journal's beginning, so stepping this state diverges immediately —
   * replay consumers must instead start from `session.createState()` and
   * let the journal reproduce the recorded path.
   */
  state: GraphRuntimeState
}

function assertSessionSave(save: unknown): asserts save is SessionSave {
  if (typeof save !== "object" || save === null) {
    throw new RuntimeError("Session save is not a JSON object.", ERR_JOURNAL_SCHEMA_MISMATCH)
  }
  const candidate = save as Partial<SessionSave>
  if (candidate.schemaVersion !== SESSION_SAVE_SCHEMA_VERSION) {
    throw new RuntimeError(
      `Unsupported session save schemaVersion: ${String(candidate.schemaVersion)}. ` +
        `Current version is ${SESSION_SAVE_SCHEMA_VERSION}.`,
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  }
  if (
    typeof candidate.state !== "object" ||
    candidate.state === null ||
    candidate.state.schemaVersion !== SERIALIZATION_SCHEMA_VERSION
  ) {
    throw new RuntimeError(
      `Unsupported session save state schemaVersion: ` +
        `${String(candidate.state?.schemaVersion)}. ` +
        `Current version is ${SERIALIZATION_SCHEMA_VERSION}.`,
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  }
  if (typeof candidate.journal !== "object" || candidate.journal === null) {
    throw new RuntimeError("Session save is missing its journal.", ERR_JOURNAL_SCHEMA_MISMATCH)
  }
}

/**
 * Rebuild a `JournalSession` and live state from a `SessionSave` (object or
 * JSON string). The journal is passed through `createJournalSession`, so all
 * journal format/capability validation applies.
 */
export function deserializeSession(
  save: SessionSave | string,
  options: DeserializeSessionOptions,
): DeserializedSession {
  const parsed: unknown = typeof save === "string" ? JSON.parse(save) : save
  assertSessionSave(parsed)
  const session = createJournalSession({
    blueprint: options.blueprint,
    evaluators: options.evaluators,
    handlers: options.handlers,
    capabilities: options.capabilities ?? parsed.capabilities,
    mode: options.mode ?? "replay",
    journal: parsed.journal,
    graphId: options.graphId,
    graphVersion: options.graphVersion,
    createdAt: options.createdAt,
  })
  return { session, state: deserializeState(parsed.state) }
}
