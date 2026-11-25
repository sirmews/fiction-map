/**
 * Journal conformance check: validates recorded-session fixtures against
 * journal.schema.json (and their embedded blueprints against
 * path-enumeration.schema.json), asserts the generated TS bindings are
 * structurally identical to the hand-written engine types, and replays each
 * fixture with plugin calls rigged to throw — replay must serve every
 * recorded exchange from the journal.
 *
 * Run: `bun run packages/runtime/conformance/journal-check.ts`
 */
import { deepStrictEqual } from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import Ajv2020 from "ajv/dist/2020"
import type { GraphBlueprint } from "../src/adapter"
import { deserializeState, serializeState } from "../src/core/state"
import { builtinEvaluators, builtinHandlers } from "../src/default-bindings"
import type { SessionSave } from "../src/journal/save"
import { deserializeSession } from "../src/journal/save"
import type {
  CapabilityDeclaration,
  JournalCheckpoint,
  JournalChoice,
  JournalDocument,
  JournalEntry,
  JournalForkPoint,
} from "../src/journal/types"
import type {
  CapabilityDeclaration as WireCapabilityDeclaration,
  JournalCheckpoint as WireJournalCheckpoint,
  JournalChoice as WireJournalChoice,
  JournalDocument as WireJournalDocument,
  JournalEntry as WireJournalEntry,
  JournalForkPoint as WireJournalForkPoint,
  SessionSave as WireSessionSave,
} from "./generated/journal"
import journalSchema from "./journal.schema.json"
import pathEnumerationSchema from "./path-enumeration.schema.json"

// ---------------------------------------------------------------------------
// Compile-time contract: generated bindings must be mutually assignable with
// the engine's hand-written types. A schema/types.ts drift fails `tsc` here.
// ---------------------------------------------------------------------------

type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false
type Assert<T extends true> = T

type _JournalDocument = Assert<MutuallyAssignable<JournalDocument, WireJournalDocument>>
type _JournalEntry = Assert<MutuallyAssignable<JournalEntry, WireJournalEntry>>
type _JournalChoice = Assert<MutuallyAssignable<JournalChoice, WireJournalChoice>>
type _JournalCheckpoint = Assert<MutuallyAssignable<JournalCheckpoint, WireJournalCheckpoint>>
type _JournalForkPoint = Assert<MutuallyAssignable<JournalForkPoint, WireJournalForkPoint>>
type _CapabilityDeclaration = Assert<
  MutuallyAssignable<CapabilityDeclaration, WireCapabilityDeclaration>
>
type _SessionSave = Assert<MutuallyAssignable<SessionSave, WireSessionSave>>

// ---------------------------------------------------------------------------
// Fixture validation + replay
// ---------------------------------------------------------------------------

const ajv = new Ajv2020({ allowUnionTypes: true, strictRequired: false })
ajv.addSchema(journalSchema, "journal")
ajv.addSchema(pathEnumerationSchema, "path-enumeration")
const validateFixture = ajv.compile({ $ref: "journal#/$defs/JournalFixture" })
const validateBlueprint = ajv.compile({ $ref: "path-enumeration#/$defs/GraphBlueprint" })

interface JournalFixture {
  name: string
  blueprint: GraphBlueprint
  replayPath: string[]
  save: SessionSave
  expectedState: ReturnType<typeof serializeState>
}

const fixturesDir = fileURLToPath(new URL("./journal-fixtures", import.meta.url))
const fixtureFiles = readdirSync(fixturesDir)
  .filter((file) => file.startsWith("journal-") && file.endsWith(".json"))
  .sort()

if (fixtureFiles.length === 0) {
  console.error("No journal fixtures found in conformance/fixtures/.")
  process.exit(1)
}

for (const file of fixtureFiles) {
  const fixture = JSON.parse(readFileSync(`${fixturesDir}/${file}`, "utf8")) as JournalFixture

  if (!validateFixture(fixture)) {
    console.error(`${file}: fixture failed journal schema validation`)
    console.error(JSON.stringify(validateFixture.errors, null, 2))
    process.exit(1)
  }
  if (!validateBlueprint(fixture.blueprint)) {
    console.error(`${file}: embedded blueprint failed path-enumeration schema validation`)
    process.exit(1)
  }

  // Rig every declared plugin type to throw: replay must never invoke them.
  const evaluators = new Map(builtinEvaluators)
  const handlers = new Map(builtinHandlers)
  const throwing = () => {
    throw new Error("plugin invoked during journal replay")
  }
  for (const entry of fixture.save.journal.entries) {
    if (entry.request.kind === "condition") evaluators.set(entry.request.pluginType, throwing)
    else handlers.set(entry.request.pluginType, throwing)
  }

  const { session } = deserializeSession(fixture.save, {
    blueprint: fixture.blueprint,
    evaluators,
    handlers,
    capabilities: fixture.save.capabilities,
    mode: "replay",
  })

  let state = deserializeState(fixture.save.journal.session.initialState)
  for (const transitionId of fixture.replayPath) {
    const available = session.getAvailable(state)
    const transition = available.find((t) => t.id === transitionId)
    if (!transition) throw new Error(`${file}: transition ${transitionId} not available`)
    state = session.step(state, transition, {}).state
  }

  // Normalize through JSON: the fixture is wire data (no undefined members,
  // plain prototypes), while serializeState emits runtime-shaped objects.
  deepStrictEqual(JSON.parse(JSON.stringify(serializeState(state))), fixture.expectedState)
  console.log(`${file}: ${fixture.name} — schema valid, replay identical`)
}
