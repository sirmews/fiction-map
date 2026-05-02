export interface MetadataLoaderOptions {
  rootDir: string
}

export type DevServerMetadataPrimitive = string | number | boolean | null
export type DevServerMetadataValue =
  | DevServerMetadataPrimitive
  | DevServerMetadataValue[]
  | { [key: string]: DevServerMetadataValue }

export type MetadataLoader<TMetadata = DevServerMetadataValue> = (
  options: MetadataLoaderOptions
) => Promise<TMetadata>

export interface DevServerRefreshError {
  message: string
  stack?: string
}

export interface DevServerStateSnapshot<TMetadata = DevServerMetadataValue> {
  metadata: TMetadata | null
  lastRefreshAt: Date | null
  isRefreshing: boolean
  refreshError: DevServerRefreshError | null
}

export interface DevServerRefreshResult<TMetadata = DevServerMetadataValue> {
  metadata: TMetadata
  refreshedAt: Date
}

export interface DevServerStateOptions<TMetadata = DevServerMetadataValue> {
  rootDir: string
  loadMetadata: MetadataLoader<TMetadata>
  initialMetadata?: TMetadata | null
  initialLastRefreshAt?: Date | null
}

interface RefreshCycle<TMetadata> {
  deferred: Deferred<DevServerRefreshResult<TMetadata>>
}

interface Deferred<TValue> {
  promise: Promise<TValue>
  reject(error: unknown): void
  resolve(value: TValue): void
}

export class DevServerState<TMetadata = DevServerMetadataValue> {
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
    return this.ensureActiveCycle().deferred.promise
  }

  async queueRefresh(): Promise<DevServerRefreshResult<TMetadata>> {
    if (!this.activeCycle) {
      return this.refresh()
    }

    if (!this.queuedCycle) {
      this.queuedCycle = createRefreshCycle<TMetadata>()
    }

    return this.queuedCycle.deferred.promise
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

function cloneValue<T>(value: T): T {
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

function createRefreshCycle<TMetadata>(): RefreshCycle<TMetadata> {
  const deferred = createDeferred<DevServerRefreshResult<TMetadata>>()
  return { deferred }
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
