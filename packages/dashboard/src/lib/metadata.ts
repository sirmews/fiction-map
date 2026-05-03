import type { MetadataSnapshot } from "@fiction-map/dev-server"

export interface DefinitionCounts {
  conditions: number
  edgeTypes: number
  effects: number
  graphs: number
  nodeTypes: number
}

export interface ValidationCounts {
  errors: number
  warnings: number
}

export interface DashboardMetadataFacts {
  counts: DefinitionCounts
  lastRefreshAt: string | null
  metadataAvailable: boolean
  refreshErrorMessage: string | null
  validationCounts: ValidationCounts
}

export function deriveDashboardMetadataFacts(
  snapshot: MetadataSnapshot | null
): DashboardMetadataFacts {
  const metadata = snapshot?.metadata

  return {
    counts: {
      conditions: metadata?.conditions.length ?? 0,
      edgeTypes: metadata?.edgeTypes.length ?? 0,
      effects: metadata?.effects.length ?? 0,
      graphs: metadata?.graphs.length ?? 0,
      nodeTypes: metadata?.nodeTypes.length ?? 0,
    },
    lastRefreshAt: snapshot?.lastRefreshAt ?? null,
    metadataAvailable: metadata !== null && metadata !== undefined,
    refreshErrorMessage: snapshot?.refreshError?.message ?? null,
    validationCounts: {
      errors: metadata?.validation.errors.length ?? 0,
      warnings: metadata?.validation.warnings.length ?? 0,
    },
  }
}

export function formatDefinitionCounts(counts: DefinitionCounts): string {
  return [
    `${counts.graphs} graphs`,
    `${counts.nodeTypes} node types`,
    `${counts.edgeTypes} edge types`,
    `${counts.conditions} conditions`,
    `${counts.effects} effects`,
  ].join(", ")
}
