import type { DashboardProjectModel } from "./project-model"

export interface DashboardCatalogSummary {
  graphs: number
  nodeTypes: number
  edgeTypes: number
  conditions: number
  effects: number
}

export interface DashboardGraphCatalogEntry {
  id: string
  name: string
  nodeCount: number
  edgeCount: number
  errorCount: number
  warningCount: number
}

export interface DashboardNodeTypeCatalogEntry {
  id: string
  name: string
  usedByGraphIds: string[]
  outgoingEdgeTypeIds: string[]
  incomingEdgeTypeIds: string[]
}

export interface DashboardEdgeTypeCatalogEntry {
  id: string
  name: string
  usedByGraphIds: string[]
  sourceNodeTypeIds: string[]
  targetNodeTypeIds: string[]
}

export interface DashboardConditionCatalogEntry {
  id: string
  name: string
  usedByGraphIds: string[]
}

export interface DashboardEffectCatalogEntry {
  id: string
  name: string
  usedByGraphIds: string[]
}

export interface DashboardCatalogModel {
  summary: DashboardCatalogSummary
  graphs: DashboardGraphCatalogEntry[]
  nodeTypes: DashboardNodeTypeCatalogEntry[]
  edgeTypes: DashboardEdgeTypeCatalogEntry[]
  conditions: DashboardConditionCatalogEntry[]
  effects: DashboardEffectCatalogEntry[]
}

export function buildCatalogModel(projectModel: DashboardProjectModel): DashboardCatalogModel {
  return {
    summary: { ...projectModel.project.counts },
    graphs: projectModel.catalogs.graphs.map((graph) => ({
      id: graph.id,
      name: graph.name,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      errorCount: graph.errors.length,
      warningCount: graph.warnings.length,
    })),
    nodeTypes: projectModel.catalogs.nodeTypes.map((nodeType) => ({
      id: nodeType.id,
      name: nodeType.name,
      usedByGraphIds: projectModel.relationships.graphIdsByNodeTypeId[nodeType.id] ?? [],
      outgoingEdgeTypeIds: nodeType.outgoingEdgeTypeIds,
      incomingEdgeTypeIds: nodeType.incomingEdgeTypeIds,
    })),
    edgeTypes: projectModel.catalogs.edgeTypes.map((edgeType) => ({
      id: edgeType.id,
      name: edgeType.name,
      usedByGraphIds: projectModel.relationships.graphIdsByEdgeTypeId[edgeType.id] ?? [],
      sourceNodeTypeIds: edgeType.sourceNodeTypeIds,
      targetNodeTypeIds: edgeType.targetNodeTypeIds,
    })),
    conditions: projectModel.catalogs.conditions.map((condition) => ({
      id: condition.id,
      name: condition.name,
      usedByGraphIds: projectModel.relationships.graphIdsByConditionId[condition.id] ?? [],
    })),
    effects: projectModel.catalogs.effects.map((effect) => ({
      id: effect.id,
      name: effect.name,
      usedByGraphIds: projectModel.relationships.graphIdsByEffectId[effect.id] ?? [],
    })),
  }
}
