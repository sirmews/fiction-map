import { describe, expect, it } from "vitest"
import type { GraphBlueprint } from "../adapter"
import { setVariable } from "../core/state"
import { builtinEvaluators, builtinHandlers } from "../default-bindings"
import type { ConditionEvaluator, EffectHandler } from "../types"
import {
  ERR_JOURNAL_BLOB_MISMATCH,
  ERR_JOURNAL_BLOB_MISSING,
  extractBlobs,
  inlineBlobs,
  isJournalBlobRef,
  journalBlobKey,
} from "./blobs"
import { createJournalSession } from "./session"
import type { CapabilityDeclaration, JournalDocument } from "./types"

const blueprint: GraphBlueprint = {
  nodes: [{ id: "start" }, { id: "end" }],
  edges: [
    {
      id: "go",
      source: "start",
      target: "end",
      conditions: [{ type: "llmGate" }],
      effects: [{ type: "llmMark" }],
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

function recordDocument(): JournalDocument {
  const evaluators = new Map<string, ConditionEvaluator>(builtinEvaluators)
  const handlers = new Map<string, EffectHandler>(builtinHandlers)
  evaluators.set("llmGate", () => true)
  handlers.set("llmMark", (state) => setVariable(state, "mark", "blobbed"))
  const session = createJournalSession({
    blueprint,
    evaluators,
    handlers,
    capabilities,
    mode: "record",
  })
  let state = session.createState()
  const available = session.getAvailable(state)
  state = session.step(state, available[0]!, {}).state
  return session.serialize()
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

describe("journal blob convention", () => {
  it("extractBlobs replaces payloads with content-addressed refs and inlineBlobs restores them", () => {
    const doc = recordDocument()
    expect(doc.entries.length).toBeGreaterThan(0)

    const { document: extracted, blobs } = extractBlobs(doc, { minBytes: 0 })
    const keys = Object.keys(blobs)
    expect(keys.length).toBeGreaterThan(0)
    for (const key of keys) {
      expect(isJournalBlobRef({ $blob: key })).toBe(true)
      expect(journalBlobKey(blobs[key])).toBe(key)
    }
    for (const entry of extracted.entries) {
      expect(isJournalBlobRef(entry.request.args)).toBe(true)
      expect(isJournalBlobRef(entry.response)).toBe(true)
    }
    // The extracted document carries the blobs map.
    expect(extracted.blobs).toEqual(blobs)

    const inlined = inlineBlobs(extracted)
    expect(inlined.blobs).toBeUndefined()
    expect(inlined.entries).toEqual(doc.entries)
    expect(inlined.choices).toEqual(doc.choices)
  })

  it("honors minBytes and leaves small payloads inline", () => {
    const doc = recordDocument()
    const { document: extracted, blobs } = extractBlobs(doc, { minBytes: 1_000_000 })
    expect(Object.keys(blobs)).toHaveLength(0)
    expect(extracted.entries).toEqual(doc.entries)
    expect(extracted.blobs).toBeUndefined()
  })

  it("is idempotent: re-extracting a blobbed document keeps existing refs", () => {
    const doc = recordDocument()
    const first = extractBlobs(doc, { minBytes: 0 })
    const second = extractBlobs(first.document, { minBytes: 0 })
    expect(second.blobs).toEqual({})
    expect(second.document.entries).toEqual(first.document.entries)
  })

  it("throws ERR_JOURNAL_BLOB_MISSING when a ref has no stored blob", () => {
    const doc = recordDocument()
    const { document: extracted } = extractBlobs(doc, { minBytes: 0 })
    const withoutBlobs: JournalDocument = { ...extracted }
    delete withoutBlobs.blobs
    expectJournalError(() => inlineBlobs(withoutBlobs), ERR_JOURNAL_BLOB_MISSING)
  })

  it("throws ERR_JOURNAL_BLOB_MISMATCH when blob content fails its hash", () => {
    const doc = recordDocument()
    const { document: extracted } = extractBlobs(doc, { minBytes: 0 })
    const key = Object.keys(extracted.blobs!)[0]!
    const tampered = {
      ...extracted,
      blobs: { ...extracted.blobs, [key]: { tampered: true } },
    }
    expectJournalError(() => inlineBlobs(tampered), ERR_JOURNAL_BLOB_MISMATCH)
  })

  it("resolves blobs from an external store merged over document.blobs", () => {
    const doc = recordDocument()
    const { document: extracted, blobs } = extractBlobs(doc, { minBytes: 0 })
    const bare: JournalDocument = { ...extracted }
    delete bare.blobs
    const inlined = inlineBlobs(bare, blobs)
    expect(inlined.entries).toEqual(doc.entries)
  })

  it("replays a blobbed-then-inlined journal with zero plugin calls", () => {
    const doc = recordDocument()
    const { document: extracted } = extractBlobs(doc, { minBytes: 0 })
    const inlined = inlineBlobs(extracted)

    let pluginCalls = 0
    const evaluators = new Map<string, ConditionEvaluator>(builtinEvaluators)
    const handlers = new Map<string, EffectHandler>(builtinHandlers)
    evaluators.set("llmGate", () => {
      pluginCalls += 1
      return true
    })
    handlers.set("llmMark", (state) => {
      pluginCalls += 1
      return setVariable(state, "mark", "live")
    })
    const session = createJournalSession({
      blueprint,
      evaluators,
      handlers,
      capabilities,
      mode: "replay",
      journal: inlined,
    })
    let state = session.createState()
    const available = session.getAvailable(state)
    state = session.step(state, available[0]!, {}).state
    expect(state.currentNodeId).toBe("end")
    expect(state.variables.mark).toBe("blobbed")
    expect(pluginCalls).toBe(0)
  })

  it("isJournalBlobRef only matches sole-key sha256 refs", () => {
    expect(isJournalBlobRef({ $blob: `sha256:${"a".repeat(64)}` })).toBe(true)
    expect(isJournalBlobRef({ $blob: "sha256:xyz" })).toBe(false)
    expect(isJournalBlobRef({ $blob: `sha256:${"a".repeat(64)}`, extra: 1 })).toBe(false)
    expect(isJournalBlobRef({ other: `sha256:${"a".repeat(64)}` })).toBe(false)
    expect(isJournalBlobRef(`sha256:${"a".repeat(64)}`)).toBe(false)
    expect(isJournalBlobRef(null)).toBe(false)
    expect(isJournalBlobRef(["$blob"])).toBe(false)
  })
})
