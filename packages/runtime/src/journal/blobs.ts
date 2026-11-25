import { RuntimeError } from "@fiction-map/core"
import { canonicalStringify, sha256Prefixed } from "./hash"
import type { JournalDocument, JournalEntry } from "./types"

export const ERR_JOURNAL_BLOB_MISSING = "ERR_JOURNAL_BLOB_MISSING"
export const ERR_JOURNAL_BLOB_MISMATCH = "ERR_JOURNAL_BLOB_MISMATCH"

/**
 * Content-addressed blob convention for large journal payloads (plan §8).
 *
 * Journal entries may carry `"$blob": "sha256:<hex>"` placeholder objects in
 * place of `request.args` or `response` when the canonical JSON of the real
 * value exceeds a size threshold. The real values live in the document's
 * `blobs` map (or an external store merged in by the caller), keyed by the
 * same `"sha256:<hex>"` string.
 *
 * The engine treats blob contents as opaque: `extractBlobs`/`inlineBlobs`
 * are storage-layer transforms applied to a serialized `JournalDocument`.
 * Always `inlineBlobs` before handing a document to `createJournalSession` —
 * replay hashes the live plugin arguments, so placeholders must be resolved
 * for `requestHash` divergence checks to line up.
 *
 * A value is only treated as a blob reference when it is an object whose
 * sole key is `$blob` and whose value matches `sha256:<64 lowercase hex>`.
 * Payloads that happen to contain such an object should not be stored inline
 * next to this convention.
 */

export interface JournalBlobRef {
  $blob: string
}

const BLOB_REF_PATTERN = /^sha256:[0-9a-f]{64}$/

export function isJournalBlobRef(value: unknown): value is JournalBlobRef {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const keys = Object.keys(value)
  if (keys.length !== 1 || keys[0] !== "$blob") return false
  const ref = (value as Record<string, unknown>).$blob
  return typeof ref === "string" && BLOB_REF_PATTERN.test(ref)
}

/** `"sha256:<hex>"` content hash of a value's canonical JSON. */
export function journalBlobKey(value: unknown): string {
  return sha256Prefixed(canonicalStringify(value))
}

export interface ExtractBlobsOptions {
  /**
   * Canonical-JSON byte length at or above which `request.args`/`response`
   * values are replaced by blob references. Defaults to 1024; pass `0` to
   * extract every payload.
   */
  minBytes?: number
}

export interface ExtractBlobsResult {
  document: JournalDocument
  /** Extracted payloads keyed by `"sha256:<hex>"`; merge into `document.blobs`. */
  blobs: Record<string, unknown>
}

function extractValue(value: unknown, minBytes: number, blobs: Record<string, unknown>): unknown {
  if (isJournalBlobRef(value)) return value
  if (canonicalStringify(value).length < minBytes) return value
  const key = journalBlobKey(value)
  blobs[key] = value
  return { $blob: key }
}

/**
 * Replace large `request.args`/`response` payloads in a journal document with
 * `{"$blob": …}` references and return the extracted payloads separately.
 * Merge `result.blobs` into `result.document.blobs` (or an external blob
 * store) before persisting. Idempotent: existing blob references are kept.
 */
export function extractBlobs(
  document: JournalDocument,
  options?: ExtractBlobsOptions,
): ExtractBlobsResult {
  const minBytes = options?.minBytes ?? 1024
  const blobs: Record<string, unknown> = {}
  const entries = document.entries.map((entry) => ({
    ...entry,
    request: {
      ...entry.request,
      args: extractValue(entry.request.args, minBytes, blobs),
    },
    response: extractValue(entry.response, minBytes, blobs),
  }))
  const merged = { ...document.blobs, ...blobs }
  return {
    document: {
      ...document,
      entries,
      ...(Object.keys(merged).length > 0 ? { blobs: merged } : {}),
    },
    blobs,
  }
}

function resolveValue(value: unknown, blobs: Record<string, unknown>): unknown {
  if (!isJournalBlobRef(value)) return value
  const key = value.$blob
  if (!Object.hasOwn(blobs, key)) {
    throw new RuntimeError(
      `Journal blob "${key}" is referenced but not present in the blob store.`,
      ERR_JOURNAL_BLOB_MISSING,
    )
  }
  const blob = blobs[key]
  if (journalBlobKey(blob) !== key) {
    throw new RuntimeError(
      `Journal blob "${key}" does not match its content hash.`,
      ERR_JOURNAL_BLOB_MISMATCH,
    )
  }
  return blob
}

function verifyRequestHash(entry: JournalEntry): void {
  const requestHash = sha256Prefixed(
    canonicalStringify({
      capability: entry.capability,
      pluginType: entry.request.pluginType,
      kind: entry.request.kind,
      args: entry.request.args,
    }),
  )
  if (requestHash !== entry.requestHash) {
    throw new RuntimeError(
      `Journal entry ${entry.seq} requestHash does not match its inlined request args.`,
      ERR_JOURNAL_BLOB_MISMATCH,
    )
  }
}

/**
 * Resolve `{"$blob": …}` placeholders back to their payloads. Blobs are
 * looked up in `document.blobs` first, then in `externalBlobs` (an externally
 * stored map keyed the same way). The returned document has inline payloads
 * and no `blobs` map. Each entry's `requestHash` is re-verified against the
 * inlined args as an integrity check.
 */
export function inlineBlobs(
  document: JournalDocument,
  externalBlobs?: Record<string, unknown>,
): JournalDocument {
  const blobs: Record<string, unknown> = { ...externalBlobs, ...document.blobs }
  const entries = document.entries.map((entry) => {
    const argsWasBlob = isJournalBlobRef(entry.request.args)
    const inlined: JournalEntry = {
      ...entry,
      request: { ...entry.request, args: resolveValue(entry.request.args, blobs) },
      response: resolveValue(entry.response, blobs),
    }
    // Only blobbed requests need re-verification; untouched entries already
    // matched at record time.
    if (argsWasBlob) verifyRequestHash(inlined)
    return inlined
  })
  const result: JournalDocument = { ...document, entries }
  delete result.blobs
  return result
}
