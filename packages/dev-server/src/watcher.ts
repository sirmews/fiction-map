import { watch, type WatchOptions, type FSWatcher } from "node:fs"

const WATCHED_FILE_SUFFIXES = [
  ".node.ts",
  ".edge.ts",
  ".condition.ts",
  ".effect.ts",
  ".graph.ts",
] as const

const EXCLUDED_PATH_SEGMENTS = new Set(["node_modules", "dist", "build", "out", "generated"])

export interface DevServerWatcherEvent {
  changedPath?: string
}

export interface DevServerWatcher {
  close(): void
}

export type DevServerWatchCallback = (
  eventType: string,
  filename: string | Buffer | null
) => void

export type DevServerWatchFactory = (
  rootDir: string,
  options: WatchOptions,
  callback: DevServerWatchCallback
) => FSWatcherLike

export interface DevServerWatcherOptions {
  rootDir: string
  debounceMs: number
  onChange(event: DevServerWatcherEvent): void | Promise<void>
  watchFactory?: DevServerWatchFactory
}

export interface FSWatcherLike {
  close(): void
}

export function createDevServerWatcher(options: DevServerWatcherOptions): DevServerWatcher {
  const watchFactory = options.watchFactory ?? defaultWatchFactory
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let latestChangedPath: string | undefined

  const watcher = watchFactory(
    options.rootDir,
    { recursive: true },
    (_eventType, filename) => {
      const changedPath = normalizeChangedPath(filename)
      if (!changedPath || !shouldTriggerRefresh(changedPath)) {
        return
      }

      latestChangedPath = changedPath

      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(() => {
        timeoutId = null
        void options.onChange({ changedPath: latestChangedPath })
      }, options.debounceMs)
    }
  )

  return {
    close() {
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
        timeoutId = null
      }

      watcher.close()
    },
  }
}

function defaultWatchFactory(
  rootDir: string,
  watchOptions: WatchOptions,
  callback: DevServerWatchCallback
): FSWatcher {
  return watch(rootDir, watchOptions, callback)
}

function normalizeChangedPath(filename: string | Buffer | null): string | undefined {
  if (filename === null) {
    return undefined
  }

  const changedPath = typeof filename === "string" ? filename : filename.toString("utf8")
  return changedPath.length > 0 ? changedPath : undefined
}

function shouldTriggerRefresh(changedPath: string): boolean {
  const normalizedPath = changedPath.replaceAll("\\", "/")
  const pathSegments = normalizedPath.split("/").filter(Boolean)

  if (pathSegments.some((segment) => EXCLUDED_PATH_SEGMENTS.has(segment))) {
    return false
  }

  return WATCHED_FILE_SUFFIXES.some((suffix) => normalizedPath.endsWith(suffix))
}
