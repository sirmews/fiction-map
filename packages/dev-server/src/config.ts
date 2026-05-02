import { resolve } from "node:path"

export const DEFAULT_DEV_SERVER_PORT = 9400
export const DEFAULT_DEV_SERVER_DEBOUNCE_MS = 100

export interface DevServerConfigInput {
  cwd?: string
  rootDir?: string
  port?: number | string
  editor?: string | null
  debounceMs?: number | string
}

export interface DevServerConfig {
  rootDir: string
  port: number
  editor: string | null
  debounceMs: number
}

export function resolveDevServerConfig(input: DevServerConfigInput = {}): DevServerConfig {
  const cwd = input.cwd ?? process.cwd()

  return {
    rootDir: resolve(cwd, input.rootDir ?? "."),
    port: normalizePort(input.port),
    editor: normalizeEditor(input.editor),
    debounceMs: normalizeDebounceMs(input.debounceMs),
  }
}

function normalizePort(value: number | string | undefined): number {
  if (value === undefined) {
    return DEFAULT_DEV_SERVER_PORT
  }

  const port = parseDecimalInteger(value, "port")
  if (port < 1 || port > 65_535) {
    throw new Error(`Invalid dev server port: ${value}`)
  }

  return port
}

function normalizeDebounceMs(value: number | string | undefined): number {
  if (value === undefined) {
    return DEFAULT_DEV_SERVER_DEBOUNCE_MS
  }

  const debounceMs = parseDecimalInteger(value, "debounceMs")
  if (debounceMs < 0) {
    throw new Error(`Invalid dev server debounceMs: ${value}`)
  }

  return debounceMs
}

function normalizeEditor(value: string | null | undefined): string | null {
  const editor = value ?? process.env.VISUAL ?? process.env.EDITOR
  if (editor === undefined || editor === null) {
    return null
  }

  const trimmed = editor.trim()
  return trimmed.length > 0 ? trimmed : null
}

function parseDecimalInteger(value: number | string, fieldName: string): number {
  if (typeof value === "number") {
    if (!Number.isInteger(value)) {
      throw new Error(`Invalid dev server ${fieldName}: ${value}`)
    }

    return value
  }

  const normalized = value.trim()
  if (!/^(0|[1-9]\d*)$/.test(normalized)) {
    throw new Error(`Invalid dev server ${fieldName}: ${value}`)
  }

  return Number.parseInt(normalized, 10)
}
