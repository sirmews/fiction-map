import type {
  DevServerConditionDefinition,
  DevServerEdgeTypeDefinition,
  DevServerEffectDefinition,
  DevServerGraphDefinition,
  DevServerGraphMetadata,
  DevServerNodeTypeDefinition,
  DevServerSourceLocation,
  DevServerValidationIssue,
  DevServerValidationSummary,
  MetadataSnapshot,
} from "@fiction-map/dev-server"

export interface DashboardDefinitionCounts {
  conditions: number
  edgeTypes: number
  effects: number
  graphs: number
  nodeTypes: number
}

export interface DashboardValidationCounts {
  errors: number
  warnings: number
}

export interface DashboardSnapshotState {
  metadataAvailable: boolean
  lastRefreshAt: string | null
  refreshErrorMessage: string | null
}

export interface DashboardProjectFacts {
  counts: DashboardDefinitionCounts
  validationCounts: DashboardValidationCounts
}

export interface DashboardNodeTypeRecord {
  id: string
  name: string
  description?: string
  location: DevServerSourceLocation
  outgoingEdgeTypeIds: string[]
  incomingEdgeTypeIds: string[]
}

export interface DashboardEdgeTypeRecord {
  id: string
  name: string
  description?: string
  location: DevServerSourceLocation
  sourceNodeTypeIds: string[]
  targetNodeTypeIds: string[]
}

export interface DashboardConditionRecord {
  id: string
  name: string
  description?: string
  location: DevServerSourceLocation
}

export interface DashboardEffectRecord {
  id: string
  name: string
  description?: string
  location: DevServerSourceLocation
}

export interface DashboardGraphRecord {
  id: string
  name: string
  description?: string
  location: DevServerSourceLocation
  nodeCount: number
  edgeCount: number
  maxDepth: number
  endingNodeIds: string[]
  usedNodeTypeIds: string[]
  usedEdgeTypeIds: string[]
  usedConditionIds: string[]
  usedEffectIds: string[]
  nodes: DevServerGraphDefinition["nodes"]
  edges: DevServerGraphDefinition["edges"]
  errors: DevServerValidationIssue[]
  warnings: DevServerValidationIssue[]
}

export interface DashboardCatalogs {
  graphs: DashboardGraphRecord[]
  nodeTypes: DashboardNodeTypeRecord[]
  edgeTypes: DashboardEdgeTypeRecord[]
  conditions: DashboardConditionRecord[]
  effects: DashboardEffectRecord[]
  graphById: Record<string, DashboardGraphRecord>
  nodeTypeById: Record<string, DashboardNodeTypeRecord>
  edgeTypeById: Record<string, DashboardEdgeTypeRecord>
  conditionById: Record<string, DashboardConditionRecord>
  effectById: Record<string, DashboardEffectRecord>
}

export interface DashboardRelationships {
  graphIdsByNodeTypeId: Record<string, string[]>
  graphIdsByEdgeTypeId: Record<string, string[]>
  graphIdsByConditionId: Record<string, string[]>
  graphIdsByEffectId: Record<string, string[]>
}

export interface DashboardValidationBuckets {
  errors: DevServerValidationIssue[]
  warnings: DevServerValidationIssue[]
}

export interface DashboardValidationModel extends DashboardValidationBuckets {
  byGraphId: Record<string, DashboardValidationBuckets>
  byNodeId: Record<string, DevServerValidationIssue[]>
  byEdgeId: Record<string, DevServerValidationIssue[]>
}

export interface DashboardProjectModel {
  snapshot: DashboardSnapshotState
  project: DashboardProjectFacts
  catalogs: DashboardCatalogs
  relationships: DashboardRelationships
  validation: DashboardValidationModel
}

export function buildDashboardProjectModel(
  snapshot: MetadataSnapshot | null
): DashboardProjectModel {
  const metadata = snapshot?.metadata
  const catalogs = buildCatalogs(metadata)
  const relationships = buildRelationships(catalogs.graphs)
  const validation = buildValidationModel(metadata?.validation, catalogs.graphs)

  return {
    snapshot: {
      metadataAvailable: metadata !== null && metadata !== undefined,
      lastRefreshAt: snapshot?.lastRefreshAt ?? null,
      refreshErrorMessage: snapshot?.refreshError?.message ?? null,
    },
    project: {
      counts: {
        graphs: catalogs.graphs.length,
        nodeTypes: catalogs.nodeTypes.length,
        edgeTypes: catalogs.edgeTypes.length,
        conditions: catalogs.conditions.length,
        effects: catalogs.effects.length,
      },
      validationCounts: {
        errors: validation.errors.length,
        warnings: validation.warnings.length,
      },
    },
    catalogs,
    relationships,
    validation,
  }
}

function buildCatalogs(
  metadata: DevServerGraphMetadata | null | undefined
): DashboardCatalogs {
  const graphs = (metadata?.graphs ?? []).map(toGraphRecord)
  const nodeTypes = (metadata?.nodeTypes ?? []).map(toNodeTypeRecord)
  const edgeTypes = (metadata?.edgeTypes ?? []).map(toEdgeTypeRecord)
  const conditions = (metadata?.conditions ?? []).map(toConditionRecord)
  const effects = (metadata?.effects ?? []).map(toEffectRecord)

  return {
    graphs,
    nodeTypes,
    edgeTypes,
    conditions,
    effects,
    graphById: indexById(graphs),
    nodeTypeById: indexById(nodeTypes),
    edgeTypeById: indexById(edgeTypes),
    conditionById: indexById(conditions),
    effectById: indexById(effects),
  }
}

function buildRelationships(graphs: DashboardGraphRecord[]): DashboardRelationships {
  const graphIdsByNodeTypeId: Record<string, string[]> = {}
  const graphIdsByEdgeTypeId: Record<string, string[]> = {}
  const graphIdsByConditionId: Record<string, string[]> = {}
  const graphIdsByEffectId: Record<string, string[]> = {}

  for (const graph of graphs) {
    appendGraphReferences(graphIdsByNodeTypeId, graph.usedNodeTypeIds, graph.id)
    appendGraphReferences(graphIdsByEdgeTypeId, graph.usedEdgeTypeIds, graph.id)
    appendGraphReferences(graphIdsByConditionId, graph.usedConditionIds, graph.id)
    appendGraphReferences(graphIdsByEffectId, graph.usedEffectIds, graph.id)
  }

  return {
    graphIdsByNodeTypeId,
    graphIdsByEdgeTypeId,
    graphIdsByConditionId,
    graphIdsByEffectId,
  }
}

function buildValidationModel(
  validation: DevServerValidationSummary | undefined,
  graphs: DashboardGraphRecord[]
): DashboardValidationModel {
  const byGraphId: Record<string, DashboardValidationBuckets> = {}
  const byNodeId: Record<string, DevServerValidationIssue[]> = {}
  const byEdgeId: Record<string, DevServerValidationIssue[]> = {}

  for (const graph of graphs) {
    byGraphId[graph.id] = {
      errors: graph.errors,
      warnings: graph.warnings,
    }

    for (const issue of graph.errors) {
      appendIssue(byNodeId, issue.nodeId, issue)
      appendIssue(byEdgeId, issue.edgeId, issue)
    }

    for (const issue of graph.warnings) {
      appendIssue(byNodeId, issue.nodeId, issue)
      appendIssue(byEdgeId, issue.edgeId, issue)
    }
  }

  return {
    errors: validation?.errors ?? [],
    warnings: validation?.warnings ?? [],
    byGraphId,
    byNodeId,
    byEdgeId,
  }
}

function toGraphRecord(graph: DevServerGraphDefinition): DashboardGraphRecord {
  return {
    id: graph.id,
    name: graph.name,
    description: graph.description,
    location: graph.location,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    maxDepth: graph.maxDepth,
    endingNodeIds: graph.endings,
    usedNodeTypeIds: graph.nodeTypesUsed,
    usedEdgeTypeIds: graph.edgeTypesUsed,
    usedConditionIds: graph.conditionsUsed,
    usedEffectIds: graph.effectsUsed,
    nodes: graph.nodes,
    edges: graph.edges,
    errors: graph.errors,
    warnings: graph.warnings,
  }
}

function toNodeTypeRecord(nodeType: DevServerNodeTypeDefinition): DashboardNodeTypeRecord {
  return {
    id: nodeType.id,
    name: nodeType.name,
    description: nodeType.description,
    location: nodeType.location,
    outgoingEdgeTypeIds: nodeType.outgoingEdges,
    incomingEdgeTypeIds: nodeType.incomingEdges,
  }
}

function toEdgeTypeRecord(edgeType: DevServerEdgeTypeDefinition): DashboardEdgeTypeRecord {
  return {
    id: edgeType.id,
    name: edgeType.name,
    description: edgeType.description,
    location: edgeType.location,
    sourceNodeTypeIds: edgeType.sourceTypes,
    targetNodeTypeIds: edgeType.targetTypes,
  }
}

function toConditionRecord(
  condition: DevServerConditionDefinition
): DashboardConditionRecord {
  return {
    id: condition.id,
    name: condition.name,
    description: condition.description,
    location: condition.location,
  }
}

function toEffectRecord(effect: DevServerEffectDefinition): DashboardEffectRecord {
  return {
    id: effect.id,
    name: effect.name,
    description: effect.description,
    location: effect.location,
  }
}

function indexById<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]))
}

function appendGraphReferences(
  graphIdsByDefinitionId: Record<string, string[]>,
  definitionIds: string[],
  graphId: string
) {
  for (const definitionId of definitionIds) {
    if (!graphIdsByDefinitionId[definitionId]) {
      graphIdsByDefinitionId[definitionId] = []
    }

    graphIdsByDefinitionId[definitionId].push(graphId)
  }
}

function appendIssue(
  issuesByEntityId: Record<string, DevServerValidationIssue[]>,
  entityId: string | undefined,
  issue: DevServerValidationIssue
) {
  if (!entityId) {
    return
  }

  if (!issuesByEntityId[entityId]) {
    issuesByEntityId[entityId] = []
  }

  issuesByEntityId[entityId].push(issue)
}
