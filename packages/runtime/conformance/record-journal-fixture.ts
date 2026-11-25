/**
 * Regenerates conformance/fixtures/journal-*.json: records a session with
 * stubbed LLM plugins, serializes it as a SessionSave, and stores the wire
 * fixture that journal-check.ts validates and replays.
 *
 * Run: `bun run packages/runtime/conformance/record-journal-fixture.ts`
 */
import { writeFileSync } from "node:fs"
import type { GraphBlueprint } from "../src/adapter"
import { serializeState, setVariable } from "../src/core/state"
import { builtinEvaluators, builtinHandlers } from "../src/default-bindings"
import { serializeSession } from "../src/journal/save"
import { createJournalSession } from "../src/journal/session"
import type { CapabilityDeclaration } from "../src/journal/types"
import type { ConditionEvaluator, EffectHandler } from "../src/types"

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
    source: { provider: "fixture", model: "stub-1", seed: 7 },
  },
}

const evaluators = new Map<string, ConditionEvaluator>(builtinEvaluators)
const handlers = new Map<string, EffectHandler>(builtinHandlers)
evaluators.set("llmGate", () => true)
handlers.set("llmMark", (state) => setVariable(state, "mark", "fixture"))

const session = createJournalSession({
  blueprint,
  evaluators,
  handlers,
  capabilities,
  mode: "record",
  graphId: "fixture/journal",
  graphVersion: "fixture-v1",
})

let state = session.createState()
for (const id of ["to-mid", "mid-end"]) {
  const available = session.getAvailable(state)
  const transition = available.find((t) => t.id === id)
  if (!transition) throw new Error(`missing ${id}`)
  state = session.step(state, transition, {}).state
}

const fixture = {
  name: "basic-recorded-session",
  blueprint,
  replayPath: ["to-mid", "mid-end"],
  save: serializeSession(session, state),
  expectedState: serializeState(state),
}

writeFileSync(
  new URL("./fixtures/journal-session-save.json", import.meta.url),
  `${JSON.stringify(fixture, null, 2)}\n`,
)
console.log("wrote fixture")
