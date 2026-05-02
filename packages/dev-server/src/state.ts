import type { JsonObject, JsonPrimitive, JsonValue } from "./protocol"

export interface MetadataLoaderOptions {
  rootDir: string
}

export type DevServerMetadataPrimitive = JsonPrimitive
export interface DevServerMetadataRecord extends JsonObject {}
export type DevServerMetadataValue = JsonValue

export type MetadataLoader<TMetadata extends object = DevServerMetadataRecord> = (
  options: MetadataLoaderOptions
) => Promise<TMetadata>

export interface DevServerRefreshError {
  message: string
  stack?: string
}

export interface DevServerStateSnapshot<TMetadata extends object = DevServerMetadataRecord> {
  metadata: TMetadata | null
  lastRefreshAt: Date | null
  isRefreshing: boolean
  refreshError: DevServerRefreshError | null
}

export interface DevServerRefreshResult<TMetadata extends object = DevServerMetadataRecord> {
  metadata: TMetadata
  refreshedAt: Date
}

export interface DevServerRefreshTask<TMetadata extends object = DevServerMetadataRecord> {
  cycleId: symbol
  promise: Promise<DevServerRefreshResult<TMetadata>>
}

export interface DevServerStateOptions<TMetadata extends object = DevServerMetadataRecord> {
  rootDir: string
  loadMetadata: MetadataLoader<TMetadata>
  initialMetadata?: TMetadata | null
  initialLastRefreshAt?: Date | null
}

interface RefreshCycle<TMetadata extends object> {
  id: symbol
  deferred: Deferred<DevServerRefreshResult<TMetadata>>
}

interface Deferred<TValue> {
  promise: Promise<TValue>
  reject(error: unknown): void
  resolve(value: TValue): void
}

export class DevServerState<TMetadata extends object = DevServerMetadataRecord> {
  readonly rootDir: string

  private readonly loadMetadata: MetadataLoader<TMetadata>
  private metadata: TMetadata | null
  private lastRefreshAt: Date | null
  private refreshError: DevServerRefreshError | null = null
  private activeCycle: RefreshCycle<TMetadata> | null = null
  private queuedCycle: RefreshCycle<TMetadata> | null = null
  private processingPromise: Promise<void> | null = null

  constructor(options: DevServerStateOptions<TMetadata>) {
    this.rootDir = options.rootDir
    this.loadMetadata = options.loadMetadata
    this.metadata = cloneValue(options.initialMetadata ?? null)
    this.lastRefreshAt = cloneDate(options.initialLastRefreshAt ?? null)
  }

  getSnapshot(): DevServerStateSnapshot<TMetadata> {
    return {
      metadata: cloneValue(this.metadata),
      lastRefreshAt: cloneDate(this.lastRefreshAt),
      isRefreshing: this.processingPromise !== null,
      refreshError: cloneRefreshError(this.refreshError),
    }
  }

  async refresh(): Promise<DevServerRefreshResult<TMetadata>> {
    return this.refreshTask().promise
  }

  async queueRefresh(): Promise<DevServerRefreshResult<TMetadata>> {
    return this.queueRefreshTask().promise
  }

  refreshTask(): DevServerRefreshTask<TMetadata> {
    const cycle = this.ensureActiveCycle()

    return {
      cycleId: cycle.id,
      promise: cycle.deferred.promise,
    }
  }

  queueRefreshTask(): DevServerRefreshTask<TMetadata> {
    if (!this.activeCycle) {
      return this.refreshTask()
    }

    if (!this.queuedCycle) {
      this.queuedCycle = createRefreshCycle<TMetadata>()
    }

    return {
      cycleId: this.queuedCycle.id,
      promise: this.queuedCycle.deferred.promise,
    }
  }

  private ensureActiveCycle(): RefreshCycle<TMetadata> {
    if (!this.activeCycle) {
      this.activeCycle = createRefreshCycle<TMetadata>()
      this.processingPromise = this.processCycles().finally(() => {
        this.processingPromise = null
      })
    }

    return this.activeCycle
  }

  private async processCycles(): Promise<void> {
    while (this.activeCycle) {
      const cycle = this.activeCycle

      try {
        cycle.deferred.resolve(await this.runSingleRefresh())
      } catch (error: unknown) {
        cycle.deferred.reject(error)
      }

      this.activeCycle = this.queuedCycle
      this.queuedCycle = null
    }
  }

  private async runSingleRefresh(): Promise<DevServerRefreshResult<TMetadata>> {
    try {
      const loadedMetadata = await this.loadMetadata({ rootDir: this.rootDir })
      const committedMetadata = cloneValue(loadedMetadata)
      const refreshedAt = new Date()

      this.metadata = committedMetadata
      this.lastRefreshAt = cloneDate(refreshedAt)
      this.refreshError = null

      return {
        metadata: cloneValue(committedMetadata),
        refreshedAt: cloneDate(refreshedAt) ?? refreshedAt,
      }
    } catch (error: unknown) {
      this.refreshError = toDevServerRefreshError(error)
      throw error
    }
  }
}

export function toDevServerRefreshError(error: unknown): DevServerRefreshError {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
    }
  }

  return {
    message: String(error),
  }
}

function cloneRefreshError(error: DevServerRefreshError | null): DevServerRefreshError | null {
  if (!error) {
    return null
  }

  return { ...error }
}

function cloneDate(value: Date | null): Date | null {
  return value ? new Date(value) : null
}

function cloneValue<T extends object | null>(value: T): T {
  if (value === null || value === undefined) {
    return value
  }

  return cloneMetadataValue(value as DevServerMetadataValue) as T
}

function cloneMetadataValue(value: DevServerMetadataValue): DevServerMetadataValue {
  if (value === null || typeof value !== "object") {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => cloneMetadataValue(item))
  }

  const clone: Record<string, DevServerMetadataValue> = {}
  for (const [key, child] of Object.entries(value)) {
    clone[key] = cloneMetadataValue(child)
  }

  return clone
}

function createRefreshCycle<TMetadata extends object>(): RefreshCycle<TMetadata> {
  const deferred = createDeferred<DevServerRefreshResult<TMetadata>>()
  return {
    id: Symbol("dev-server-refresh-cycle"),
    deferred,
  }
}

function createDeferred<TValue>(): Deferred<TValue> {
  let resolve!: (value: TValue) => void
  let reject!: (error: unknown) => void

  const promise = new Promise<TValue>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return {
    promise,
    reject,
    resolve,
  }
}
