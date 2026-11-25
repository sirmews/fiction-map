// Generated from journal.schema.json. DO NOT EDIT.

export interface SerializableEntityState {
  owned: Array<string>
  active: Array<string>
  unlocked: Array<string>
  resources: Record<string, number>
  extensions?: Record<string, unknown>
}

export interface SerializableState {
  schemaVersion: 1
  currentNodeId: string
  history: Array<string>
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: Array<string>
  entityState?: SerializableEntityState
  extensions?: Record<string, unknown>
}

export interface JournalSessionInfo {
  graphId?: string
  graphVersion?: string
  createdAt: string
  initialState: SerializableState
}

export interface JournalRequest {
  pluginType: string
  kind: "condition" | "effect"
  args: unknown
}

export interface CapabilityDeclaration {
  pluginTypes: Array<string>
  version: string
  reexecutable: boolean
  sideEffectFree: boolean
  source?: Record<string, unknown>
}

export interface JournalEntry {
  seq: number
  stepIndex: number
  stateFingerprint: string
  capability: string
  requestHash: string
  request: JournalRequest
  response: unknown
  durationMs: number
}

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
  parentHash: string
  atSeq: number
}

export interface JournalDocument {
  format: "fiction-map/journal"
  formatVersion: 1
  session: JournalSessionInfo
  capabilities: Record<string, CapabilityDeclaration>
  entries: Array<JournalEntry>
  choices: Array<JournalChoice>
  checkpoints?: Array<JournalCheckpoint>
  forkPoint?: JournalForkPoint
  blobs?: Record<string, unknown>
}

export interface SessionSave {
  schemaVersion: 1
  state: SerializableState
  journal: JournalDocument
  capabilities: Record<string, CapabilityDeclaration>
}

export interface JournalFixture {
  name: string
  blueprint: unknown
  replayPath: Array<string>
  save: SessionSave
  expectedState: SerializableState
}
