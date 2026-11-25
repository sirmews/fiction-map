import { RuntimeError } from "@fiction-map/core"
import type { GraphBlueprint } from "../adapter"
import { cloneState, deserializeState, serializeState } from "../core/state"
import { builtinEvaluators, builtinHandlers } from "../default-bindings"
import { GraphRuntime, type StepResult, type TraversalPath } from "../runtime"
import type {
  Condition,
  ConditionEvaluator,
  Effect,
  EffectContext,
  EffectHandler,
  EvaluationContext,
  GraphRuntimeState,
  NodeDefinition,
  SerializableState,
  StateTrigger,
  Transition,
  TransitionResult,
} from "../types"
import { SERIALIZATION_SCHEMA_VERSION } from "../types"
import { getVisitedConditionNodeIds, SymbolicState } from "../validation/symbolicState"
import { canonicalStringify, sha256Prefixed } from "./hash"
import {
  type CapabilityDeclaration,
  JOURNAL_FORMAT,
  JOURNAL_FORMAT_VERSION,
  type JournalChoice,
  type JournalDocument,
  type JournalEntry,
  type JournalMode,
} from "./types"

export const ERR_JOURNAL_DIVERGENCE = "ERR_JOURNAL_DIVERGENCE"
export const ERR_JOURNAL_EXHAUSTED = "ERR_JOURNAL_EXHAUSTED"
export const ERR_JOURNAL_SCHEMA_MISMATCH = "ERR_JOURNAL_SCHEMA_MISMATCH"
export const ERR_JOURNAL_FORK_BOUNDARY = "ERR_JOURNAL_FORK_BOUNDARY"
export const ERR_CAPABILITY_MISMATCH = "ERR_CAPABILITY_MISMATCH"
export const ERR_CAPABILITY_UNDECLARED = "ERR_CAPABILITY_UNDECLARED"

export interface JournalSessionOptions {
  blueprint: GraphBlueprint
  /** Defaults to `builtinEvaluators`, matching `GraphRuntime`. */
  evaluators?: Map<string, ConditionEvaluator>
  /** Defaults to `builtinHandlers`, matching `GraphRuntime`. */
  handlers?: Map<string, EffectHandler>
  /**
   * Capability declarations keyed by capability id. Required in record mode
   * for any non-builtin plugin the session may invoke, and in replay mode
   * for every capability in the journal manifest.
   */
  capabilities?: ReadonlyMap<string, CapabilityDeclaration> | Record<string, CapabilityDeclaration>
  /** Defaults to `"record"`. */
  mode?: JournalMode
  /**
   * Existing journal to adopt. Required for `"replay"`; optional for
   * `"record"` to continue an existing journal (e.g. a fork prefix).
   */
  journal?: JournalDocument | null
  graphId?: string
  graphVersion?: string
  createdAt?: string
  /** State the session starts from; serialized into `session.initialState`. */
  initialState?: GraphRuntimeState | SerializableState
}

type PluginResolution = { capabilityId: string; declaration: CapabilityDeclaration }

interface CapabilityRequest {
  pluginType: string
  capability: string
  kind: "condition" | "effect"
  args: unknown
}

const now = (): number => (typeof performance !== "undefined" ? performance.now() : Date.now())

function normalizeCapabilities(
  capabilities?: JournalSessionOptions["capabilities"],
): Map<string, CapabilityDeclaration> {
  if (!capabilities) return new Map()
  if (capabilities instanceof Map) return new Map(capabilities)
  return new Map(Object.entries(capabilities))
}

function isSerializableState(value: unknown): value is SerializableState {
  return (
    typeof value === "object" &&
    value !== null &&
    "schemaVersion" in value &&
    "currentNodeId" in value &&
    "visited" in value &&
    Array.isArray((value as SerializableState).visited)
  )
}

function toSerializableState(state: GraphRuntimeState | SerializableState): SerializableState {
  if (isSerializableState(state)) {
    if (state.schemaVersion !== SERIALIZATION_SCHEMA_VERSION) {
      throw new RuntimeError(
        `Unsupported journal initialState schemaVersion: ${state.schemaVersion}. ` +
          `Current version is ${SERIALIZATION_SCHEMA_VERSION}.`,
        ERR_JOURNAL_SCHEMA_MISMATCH,
      )
    }
    return state
  }
  return serializeState(state)
}

function assertJournalDocument(journal: JournalDocument): void {
  if (journal.format !== JOURNAL_FORMAT || journal.formatVersion !== JOURNAL_FORMAT_VERSION) {
    throw new RuntimeError(
      `Unsupported journal format: ${String(journal.format)} v${String(journal.formatVersion)}. ` +
        `Expected ${JOURNAL_FORMAT} v${JOURNAL_FORMAT_VERSION}.`,
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  }
  if (!journal.session || typeof journal.session !== "object") {
    throw new RuntimeError("Journal is missing its session block.", ERR_JOURNAL_SCHEMA_MISMATCH)
  }
  if (!Array.isArray(journal.entries) || !Array.isArray(journal.choices)) {
    throw new RuntimeError(
      "Journal is missing entries/choices arrays.",
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  }
  const initialState = journal.session?.initialState
  if (initialState && initialState.schemaVersion !== SERIALIZATION_SCHEMA_VERSION) {
    throw new RuntimeError(
      `Unsupported journal initialState schemaVersion: ${initialState.schemaVersion}. ` +
        `Current version is ${SERIALIZATION_SCHEMA_VERSION}.`,
      ERR_JOURNAL_SCHEMA_MISMATCH,
    )
  }
}

/**
 * A Session wrapper around `GraphRuntime` that records, replays, or bypasses
 * plugin (capability) exchanges.
 *
 * `GraphRuntime`'s evaluator/handler maps are private, so the session builds
 * its own runtime from the same inputs plus journaled wrapper maps. Callers
 * pass `blueprint` + optional maps — a pre-built `GraphRuntime` cannot be
 * wrapped after the fact.
 *
 * Modes:
 * - `"record"`: plugins run live; every non-builtin, non-reexecutable
 *   exchange is appended to `entries`. Every `step()` also appends a
 *   `choices` record. Undeclared custom plugins throw
 *   `ERR_CAPABILITY_UNDECLARED`.
 * - `"replay"`: plugins declared `reexecutable && sideEffectFree` run live;
 *   all other journaled exchanges are served from `entries` in seq order.
 *   Fingerprint/request-hash mismatches throw `ERR_JOURNAL_DIVERGENCE`;
 *   running past the recorded end throws `ERR_JOURNAL_EXHAUSTED`.
 * - `"off"`: live-unrecorded; plugins pass through and nothing is journaled.
 *
 * `stepIndex` semantics: a monotonically increasing index assigned per
 * top-level session operation (`step`, `getAvailable`, `getByAvailability`,
 * and each `walk`/`walkWithContext` iteration). `getAvailable` probing is
 * journaled as ordinary entries sharing the probe's stepIndex. Capability
 * invocations triggered inside `step()` (requirements, effects, triggers,
 * auto-resolve re-entry) share that step's index.
 *
 * Built-in evaluators/handlers (the exact function references registered in
 * `builtinEvaluators`/`builtinHandlers`) are implicitly reexecutable and
 * side-effect-free: they are never journaled and always run live.
 *
 * `enumeratePaths()` is bulk analysis, not a session: it always runs
 * live-unrecorded against the registered plugins and never touches the
 * journal, in every mode.
 */
export class JournalSession {
  private readonly blueprint: GraphBlueprint
  private readonly rawEvaluators: Map<string, ConditionEvaluator>
  private readonly rawHandlers: Map<string, EffectHandler>
  private readonly runtime: GraphRuntime
  private readonly analysisRuntime: GraphRuntime
  private readonly mode: JournalMode
  private readonly capabilities: Map<string, CapabilityDeclaration>
  private readonly pluginResolution: Map<string, PluginResolution>
  private readonly entries: JournalEntry[] = []
  private readonly choices: JournalChoice[] = []
  private readonly sessionMeta: JournalDocument["session"]
  private readonly forkPoint?: JournalDocument["forkPoint"]
  private opIndex = 0
  private activeStepIndex: number | null = null
  private entryCursor = 0
  private choiceCursor = 0
  private visitNodesCache?: { triggerCount: number; nodeIds: string[] }

  private constructor(options: JournalSessionOptions, journal?: JournalDocument) {
    this.blueprint = options.blueprint
    this.mode = options.mode ?? "record"
    this.rawEvaluators = options.evaluators ?? builtinEvaluators
    this.rawHandlers = options.handlers ?? builtinHandlers
    const provided = normalizeCapabilities(options.capabilities)

    if (journal) {
      assertJournalDocument(journal)
      this.entries.push(...journal.entries)
      this.choices.push(...journal.choices)
      this.sessionMeta = {
        graphId: options.graphId ?? journal.session.graphId,
        graphVersion: options.graphVersion ?? journal.session.graphVersion,
        createdAt: options.createdAt ?? journal.session.createdAt,
        initialState: journal.session.initialState,
      }
      this.forkPoint = journal.forkPoint
      // Replay must verify the caller's declarations against the recorded
      // manifest; record continuation may adopt the journal's own manifest.
      if (this.mode === "replay") this.validateManifest(journal, provided)
      this.capabilities =
        provided.size > 0 ? provided : new Map(Object.entries(journal.capabilities ?? {}))
    } else {
      this.capabilities = provided
      this.sessionMeta = {
        graphId: options.graphId,
        graphVersion: options.graphVersion,
        createdAt: options.createdAt ?? new Date().toISOString(),
        initialState: toSerializableState(
          options.initialState ?? new GraphRuntime(this.blueprint).createState(),
        ),
      }
    }

    this.pluginResolution = this.buildPluginResolution()
    const { evaluators, handlers } = this.buildWrappedMaps()
    this.runtime = new GraphRuntime(this.blueprint, evaluators, handlers)
    this.analysisRuntime = new GraphRuntime(this.blueprint, this.rawEvaluators, this.rawHandlers)
  }

  static create(options: JournalSessionOptions): JournalSession {
    const mode = options.mode ?? "record"
    const journal = options.journal ?? undefined
    if (mode === "replay") {
      if (!journal) {
        throw new RuntimeError(
          "Replay mode requires a journal document.",
          ERR_JOURNAL_SCHEMA_MISMATCH,
        )
      }
    } else if (journal) {
      assertJournalDocument(journal)
    }
    return new JournalSession(options, journal)
  }

  private validateManifest(
    journal: JournalDocument,
    provided: ReadonlyMap<string, CapabilityDeclaration>,
  ): void {
    for (const [capabilityId, recorded] of Object.entries(journal.capabilities ?? {})) {
      const declaration = provided.get(capabilityId)
      if (!declaration || declaration.version !== recorded.version) {
        throw new RuntimeError(
          `Capability manifest mismatch for "${capabilityId}": journal pins version ` +
            `${recorded.version} but the session provides ${declaration?.version ?? "nothing"}.`,
          ERR_CAPABILITY_MISMATCH,
        )
      }
    }
  }

  private buildPluginResolution(): Map<string, PluginResolution> {
    const resolution = new Map<string, PluginResolution>()
    for (const [capabilityId, declaration] of this.capabilities) {
      for (const pluginType of declaration.pluginTypes) {
        resolution.set(pluginType, { capabilityId, declaration })
      }
    }
    return resolution
  }

  private buildWrappedMaps(): {
    evaluators: Map<string, ConditionEvaluator>
    handlers: Map<string, EffectHandler>
  } {
    if (this.mode === "off") {
      return { evaluators: this.rawEvaluators, handlers: this.rawHandlers }
    }
    const evaluators = new Map<string, ConditionEvaluator>()
    for (const [type, fn] of this.rawEvaluators) {
      evaluators.set(type, this.wrapEvaluator(type, fn))
    }
    const handlers = new Map<string, EffectHandler>()
    for (const [type, fn] of this.rawHandlers) {
      handlers.set(type, this.wrapHandler(type, fn))
    }
    return { evaluators, handlers }
  }

  private wrapEvaluator(type: string, fn: ConditionEvaluator): ConditionEvaluator {
    const passthrough = this.passthroughReason(type, fn, builtinEvaluators)
    if (passthrough) return fn
    const resolved = this.pluginResolution.get(type)
    if (!resolved) {
      if (this.mode === "off") return fn
      return () => {
        throw new RuntimeError(
          `Plugin "${type}" has no capability declaration. ` +
            'Declare it in JournalSessionOptions.capabilities or use mode "off".',
          ERR_CAPABILITY_UNDECLARED,
        )
      }
    }
    return (state, condition, context) =>
      this.invokeCapability<boolean>(
        state,
        {
          pluginType: type,
          capability: resolved.capabilityId,
          kind: "condition",
          args: condition,
        },
        () => fn(state, condition, context),
        (response) => {
          if (typeof response !== "boolean") {
            throw new RuntimeError(
              `Journal entry for "${type}" recorded a non-boolean evaluator response.`,
              ERR_JOURNAL_DIVERGENCE,
            )
          }
          return response
        },
      )
  }

  private wrapHandler(type: string, fn: EffectHandler): EffectHandler {
    const passthrough = this.passthroughReason(type, fn, builtinHandlers)
    if (passthrough) return fn
    const resolved = this.pluginResolution.get(type)
    if (!resolved) {
      if (this.mode === "off") return fn
      return () => {
        throw new RuntimeError(
          `Plugin "${type}" has no capability declaration. ` +
            'Declare it in JournalSessionOptions.capabilities or use mode "off".',
          ERR_CAPABILITY_UNDECLARED,
        )
      }
    }
    return (state, effect, context) =>
      this.invokeCapability<GraphRuntimeState>(
        state,
        {
          pluginType: type,
          capability: resolved.capabilityId,
          kind: "effect",
          args: effect,
        },
        () => fn(state, effect, context),
        (response) => {
          if (!isSerializableState(response)) {
            throw new RuntimeError(
              `Journal entry for "${type}" recorded a malformed effect response.`,
              ERR_JOURNAL_DIVERGENCE,
            )
          }
          return deserializeState(response)
        },
      )
  }

  /**
   * Returns a reason the plugin must run live (unjournaled), or null when the
   * exchange must go through the journal.
   */
  private passthroughReason(type: string, fn: unknown, builtins: Map<string, unknown>): boolean {
    // The exact builtin function reference: implicitly reexecutable and
    // side-effect-free, never journaled.
    if (builtins.get(type) === fn) return true
    const resolved = this.pluginResolution.get(type)
    if (resolved?.declaration.reexecutable && resolved.declaration.sideEffectFree) return true
    return false
  }

  private invokeCapability<T>(
    state: GraphRuntimeState,
    request: CapabilityRequest,
    run: () => T,
    decode: (response: unknown) => T,
  ): T {
    if (this.mode === "off") return run()

    const requestHash = sha256Prefixed(
      canonicalStringify({
        capability: request.capability,
        pluginType: request.pluginType,
        kind: request.kind,
        args: request.args,
      }),
    )
    const stateFingerprint = this.fingerprint(state)

    if (this.mode === "record") {
      const started = now()
      const response = run()
      const encoded =
        request.kind === "effect" ? serializeState(response as GraphRuntimeState) : response
      this.entries.push({
        seq: this.entries.length,
        stepIndex: this.activeStepIndex ?? 0,
        stateFingerprint,
        capability: request.capability,
        requestHash,
        request: {
          pluginType: request.pluginType,
          kind: request.kind,
          args: request.args as Condition | Effect,
        },
        response: encoded,
        durationMs: now() - started,
      })
      return response
    }

    const entry = this.entries[this.entryCursor]
    if (!entry) {
      throw new RuntimeError(
        `Journal exhausted: replay requested capability "${request.capability}" ` +
          `(${request.pluginType}) past the recorded end.`,
        ERR_JOURNAL_EXHAUSTED,
      )
    }
    this.entryCursor += 1
    if (
      entry.stateFingerprint !== stateFingerprint ||
      entry.requestHash !== requestHash ||
      entry.capability !== request.capability
    ) {
      throw new RuntimeError(
        `Journal divergence at entry ${entry.seq}: expected capability ` +
          `"${entry.capability}" (${entry.requestHash}) on state ` +
          `${entry.stateFingerprint}, got "${request.capability}" ` +
          `(${requestHash}) on state ${stateFingerprint}.`,
        ERR_JOURNAL_DIVERGENCE,
      )
    }
    return decode(entry.response)
  }

  private fingerprint(state: GraphRuntimeState): string {
    const triggers = this.runtime.triggers
    if (!this.visitNodesCache || this.visitNodesCache.triggerCount !== triggers.length) {
      this.visitNodesCache = {
        triggerCount: triggers.length,
        nodeIds: getVisitedConditionNodeIds(this.runtime.transitions, triggers),
      }
    }
    return new SymbolicState(state, this.visitNodesCache.nodeIds).getFingerprint()
  }

  private withOperation<T>(fn: () => T): T {
    this.opIndex += 1
    const previous = this.activeStepIndex
    this.activeStepIndex = this.opIndex
    try {
      return fn()
    } finally {
      this.activeStepIndex = previous
    }
  }

  // ------------------------------------------------------------------
  // GraphRuntime surface (journaled)
  // ------------------------------------------------------------------

  get triggers(): StateTrigger[] {
    return this.runtime.triggers
  }

  get transitions(): Transition[] {
    return this.runtime.transitions
  }

  get nodes(): Map<string, NodeDefinition> {
    return this.runtime.nodes
  }

  get startNodeId(): string {
    return this.runtime.startNodeId
  }

  get endingNodeIds(): Set<string> {
    return this.runtime.endingNodeIds
  }

  isEnding(nodeId: string): boolean {
    return this.runtime.isEnding(nodeId)
  }

  createState(
    initialVariables?: Record<string, unknown>,
    initialExtensions?: Record<string, unknown>,
  ): GraphRuntimeState {
    return this.runtime.createState(initialVariables, initialExtensions)
  }

  addTrigger(trigger: StateTrigger): void {
    this.runtime.addTrigger(trigger)
    this.analysisRuntime.addTrigger(trigger)
  }

  getAvailable(state: GraphRuntimeState, context?: EvaluationContext): Transition[] {
    return this.withOperation(() => this.runtime.getAvailable(state, context))
  }

  getByAvailability(
    state: GraphRuntimeState,
    context?: EvaluationContext,
  ): { available: Transition[]; blocked: Transition[]; hidden: Transition[] } {
    return this.withOperation(() => this.runtime.getByAvailability(state, context))
  }

  step(
    state: GraphRuntimeState,
    transition: Transition,
    context?: EvaluationContext & EffectContext,
  ): TransitionResult {
    return this.withOperation(() => {
      if (this.mode === "record") {
        this.choices.push({
          seq: this.choices.length,
          stepIndex: this.activeStepIndex ?? 0,
          transitionId: transition.id,
          stateFingerprint: this.fingerprint(state),
        })
      } else if (this.mode === "replay") {
        const choice = this.choices[this.choiceCursor]
        if (!choice) {
          throw new RuntimeError(
            "Journal exhausted: replay attempted a step past the recorded choices.",
            ERR_JOURNAL_EXHAUSTED,
          )
        }
        this.choiceCursor += 1
        if (
          choice.transitionId !== transition.id ||
          choice.stateFingerprint !== this.fingerprint(state)
        ) {
          throw new RuntimeError(
            `Journal divergence at choice ${choice.seq}: expected transition ` +
              `"${choice.transitionId}" on state ${choice.stateFingerprint}, got ` +
              `"${transition.id}" on state ${this.fingerprint(state)}.`,
            ERR_JOURNAL_DIVERGENCE,
          )
        }
      }
      return this.runtime.step(state, transition, context)
    })
  }

  /**
   * Live-unrecorded bulk path analysis. Runs against the registered plugins
   * directly and never reads or writes the journal, in every mode.
   */
  enumeratePaths(
    maxDepth: number = 50,
    maxPaths: number = 100,
    context?: EvaluationContext & EffectContext,
  ): TraversalPath[] {
    return this.analysisRuntime.enumeratePaths(maxDepth, maxPaths, context)
  }

  walk(
    state: GraphRuntimeState,
    maxSteps: number = 100,
    context?: EvaluationContext & EffectContext,
  ): StepResult[] {
    return this.walkImpl(state, maxSteps, false, () => context)
  }

  walkWithContext(
    state: GraphRuntimeState,
    makeContext: (state: GraphRuntimeState) => EvaluationContext & EffectContext,
    maxSteps: number = 100,
  ): StepResult[] {
    return this.walkImpl(state, maxSteps, true, makeContext)
  }

  private walkImpl(
    state: GraphRuntimeState,
    maxSteps: number,
    dynamic: boolean,
    makeContext: (state: GraphRuntimeState) => (EvaluationContext & EffectContext) | undefined,
  ): StepResult[] {
    const steps: StepResult[] = []
    const seen = new Set([this.fingerprint(state)])
    let current = state
    for (let index = 0; index < maxSteps; index++) {
      const context = makeContext(current)
      const available = this.getAvailable(current, context)
      if (available.length === 0) {
        steps.push({
          state: cloneState(current),
          nodeId: current.currentNodeId,
          available,
          applied: null,
        })
        break
      }
      const result = this.step(current, available[0]!, context)
      const snapshot = dynamic ? result.state : cloneState(result.state)
      steps.push({
        state: snapshot,
        nodeId: result.state.currentNodeId,
        available,
        applied: result,
      })
      const identity = this.fingerprint(result.state)
      const repeat = seen.has(identity)
      seen.add(identity)
      if (repeat) break
      current = result.state
    }
    return steps
  }

  // ------------------------------------------------------------------
  // Journal surface
  // ------------------------------------------------------------------

  get journalEntries(): readonly JournalEntry[] {
    return this.entries
  }

  get journalChoices(): readonly JournalChoice[] {
    return this.choices
  }

  serialize(): JournalDocument {
    const capabilities: Record<string, CapabilityDeclaration> = {}
    for (const [id, declaration] of this.capabilities) {
      capabilities[id] = { ...declaration, pluginTypes: [...declaration.pluginTypes] }
    }
    return {
      format: JOURNAL_FORMAT,
      formatVersion: JOURNAL_FORMAT_VERSION,
      session: {
        graphId: this.sessionMeta.graphId,
        graphVersion: this.sessionMeta.graphVersion,
        createdAt: this.sessionMeta.createdAt,
        initialState: this.sessionMeta.initialState,
      },
      capabilities,
      entries: this.entries.map((entry) => ({
        ...entry,
        request: { ...entry.request },
      })),
      choices: this.choices.map((choice) => ({ ...choice })),
      ...(this.forkPoint ? { forkPoint: { ...this.forkPoint } } : {}),
    }
  }

  /**
   * Fork the session at a journal entry boundary. Returns a new record-mode
   * session whose journal is the prefix `entries[0..atSeq]` (plus the choices
   * belonging to the same completed steps) marked with a `forkPoint`.
   *
   * `atSeq` must be the last entry of its `stepIndex` group; forking mid-step
   * throws `ERR_JOURNAL_FORK_BOUNDARY`.
   */
  fork(atSeq: number): JournalSession {
    const last = Number.isInteger(atSeq) ? this.entries[atSeq] : undefined
    if (!last || atSeq < 0) {
      throw new RuntimeError(
        `fork atSeq ${atSeq} is out of range (journal has ${this.entries.length} entries).`,
        ERR_JOURNAL_SCHEMA_MISMATCH,
      )
    }
    const next = this.entries[atSeq + 1]
    if (next && next.stepIndex === last.stepIndex) {
      throw new RuntimeError(
        `fork atSeq ${atSeq} splits stepIndex ${last.stepIndex}; ` +
          "fork at the last entry of a step instead.",
        ERR_JOURNAL_FORK_BOUNDARY,
      )
    }
    const prefixEntries = this.entries.slice(0, atSeq + 1)
    const prefixChoices = this.choices.filter((choice) => choice.stepIndex <= last.stepIndex)
    const parentHash = sha256Prefixed(
      canonicalStringify({ entries: prefixEntries, choices: prefixChoices }),
    )
    const prefixJournal: JournalDocument = {
      format: JOURNAL_FORMAT,
      formatVersion: JOURNAL_FORMAT_VERSION,
      session: { ...this.sessionMeta, initialState: this.sessionMeta.initialState },
      capabilities: this.serialize().capabilities,
      entries: prefixEntries.map((entry) => ({ ...entry, request: { ...entry.request } })),
      choices: prefixChoices.map((choice) => ({ ...choice })),
      forkPoint: { parentHash, atSeq },
    }
    return JournalSession.create({
      blueprint: this.blueprint,
      evaluators: this.rawEvaluators,
      handlers: this.rawHandlers,
      capabilities: this.capabilities,
      mode: "record",
      journal: prefixJournal,
      graphId: this.sessionMeta.graphId,
      graphVersion: this.sessionMeta.graphVersion,
      createdAt: this.sessionMeta.createdAt,
    })
  }
}

export function createJournalSession(options: JournalSessionOptions): JournalSession {
  return JournalSession.create(options)
}
