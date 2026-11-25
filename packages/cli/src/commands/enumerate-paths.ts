/**
 * Enumerate paths via the native Rust runtime binary.
 *
 * Usage: fiction-map enumerate-paths [options]
 *
 * Reads .fiction-map/metadata.json, converts each selected graph to the
 * path-enumeration wire blueprint, and sends one JSON request per line to the
 * `fiction-map-runtime` binary built from packages/runtime-rs. The binary
 * answers with one JSON response per line on stdout.
 *
 * Binary lookup order:
 *   1. $FICTION_MAP_RUNTIME_RS
 *   2. packages/runtime-rs/target/release/fiction-map-runtime
 *   3. packages/runtime-rs/target/debug/fiction-map-runtime
 *
 * Build the binary with:
 *   cargo build --release --manifest-path packages/runtime-rs/Cargo.toml
 */

import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { GraphDefinition } from "@fiction-map/core"
import { graphDefinitionToBlueprint } from "@fiction-map/runtime"
import { loadMetadata, type MetadataCommandOptions, selectGraphs } from "./query"

export interface EnumeratePathsOptions extends MetadataCommandOptions {
  graph?: string
  maxDepth?: number
  maxPaths?: number
  json?: boolean
}

// Wire types mirroring packages/runtime/conformance/generated/pathEnumeration.ts.
// They are declared locally because the CLI package cannot import outside its
// src root; the binary is the source of truth for the actual contract.
interface EnumerationRequest {
  blueprint: unknown
  maxDepth?: number
  maxPaths?: number
}

interface EnumerationResponse {
  paths?: unknown[]
  error?: { code: string; message: string }
}

interface GraphResult {
  graphId: string
  response: EnumerationResponse
}

interface SpawnResult {
  status: number | null
  stdout: string
  stderr: string
  error?: Error
}

type SpawnFn = (binary: string, input: string) => SpawnResult

const BINARY_NAME = process.platform === "win32" ? "fiction-map-runtime.exe" : "fiction-map-runtime"

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function ancestorDirs(start: string): string[] {
  const dirs: string[] = []
  let current = resolve(start)
  for (;;) {
    dirs.push(current)
    const parent = dirname(current)
    if (parent === current) return dirs
    current = parent
  }
}

/**
 * Locate the native runtime binary. Exported for tests.
 */
export function resolveRuntimeBinary(env: NodeJS.ProcessEnv = process.env): string | null {
  const envPath = env.FICTION_MAP_RUNTIME_RS
  if (envPath) {
    return existsSync(envPath) ? resolve(envPath) : null
  }

  const starts = [fileURLToPath(import.meta.url), join(process.cwd(), "cli.ts")]
  const seen = new Set<string>()
  for (const start of starts) {
    for (const dir of ancestorDirs(start)) {
      if (seen.has(dir)) continue
      seen.add(dir)
      for (const profile of ["release", "debug"] as const) {
        const candidate = join(dir, "packages", "runtime-rs", "target", profile, BINARY_NAME)
        if (existsSync(candidate)) return candidate
      }
    }
  }
  return null
}

function missingBinaryError(): string {
  return [
    "❌ Could not find the native runtime binary `fiction-map-runtime`.",
    "",
    "Build it with:",
    "  cargo build --release --manifest-path packages/runtime-rs/Cargo.toml",
    "",
    "Or point FICTION_MAP_RUNTIME_RS at a prebuilt binary.",
  ].join("\n")
}

export function buildRequests(
  graphs: GraphDefinition[],
  options: Pick<EnumeratePathsOptions, "maxDepth" | "maxPaths"> = {},
): EnumerationRequest[] {
  return graphs.map((graph) => {
    const request: EnumerationRequest = { blueprint: graphDefinitionToBlueprint(graph) }
    if (options.maxDepth !== undefined) request.maxDepth = options.maxDepth
    if (options.maxPaths !== undefined) request.maxPaths = options.maxPaths
    return request
  })
}

const defaultSpawn: SpawnFn = (binary, input) => {
  const result = spawnSync(binary, [], {
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  }
}

function parseResponses(stdout: string, expected: number): EnumerationResponse[] {
  const lines = stdout.split("\n").filter((line) => line.trim().length > 0)
  if (lines.length !== expected) {
    fail(
      `❌ Runtime returned ${lines.length} response(s) for ${expected} request(s). ` +
        "The native binary may be outdated; rebuild it with " +
        "`cargo build --release --manifest-path packages/runtime-rs/Cargo.toml`.",
    )
  }
  return lines.map((line, index) => {
    try {
      return JSON.parse(line) as EnumerationResponse
    } catch {
      return fail(`❌ Failed to parse response line ${index + 1} from the runtime binary.`)
    }
  })
}

export async function enumeratePaths(
  options: EnumeratePathsOptions = {},
  spawn: SpawnFn = defaultSpawn,
  binary?: string,
): Promise<void> {
  for (const [name, value] of [
    ["--max-depth", options.maxDepth],
    ["--max-paths", options.maxPaths],
  ] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1)) {
      fail(`❌ ${name} must be a positive integer.`)
    }
  }

  const resolvedBinary = binary ?? resolveRuntimeBinary()
  if (!resolvedBinary) {
    fail(missingBinaryError())
  }

  const { metadata } = await loadMetadata(options)
  const graphs = selectGraphs(metadata, options.graph)
  const requests = buildRequests(graphs, options)

  const input = `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`
  const result = spawn(resolvedBinary, input)

  if (result.error) {
    fail(`❌ Failed to run ${resolvedBinary}:\n${result.error.message}\n\n${missingBinaryError()}`)
  }
  if (result.status !== 0) {
    fail(
      `❌ Runtime binary exited with code ${result.status}.\n${result.stderr.trim()}\n\n` +
        "Rebuild it with `cargo build --release --manifest-path packages/runtime-rs/Cargo.toml`.",
    )
  }

  const responses = parseResponses(result.stdout, requests.length)
  const results: GraphResult[] = graphs.map((graph, index) => ({
    graphId: graph.id,
    response: responses[index],
  }))

  if (options.json) {
    console.log(JSON.stringify(results, null, 2))
  } else {
    for (const { graphId, response } of results) {
      console.log(`Graph: ${graphId}`)
      console.log(JSON.stringify(response, null, 2))
      console.log("")
    }
  }

  if (results.some(({ response }) => response.error)) {
    process.exit(1)
  }
}
