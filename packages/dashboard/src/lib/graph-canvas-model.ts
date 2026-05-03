import type { DevServerValidationIssue } from "@fiction-map/dev-server"
import type { DashboardProjectModel } from "./project-model"

export interface DashboardCanvasNode {
  id: string
  label: string
  nodeTypeId: string
  isEnding: boolean
}

export interface DashboardCanvasEdge {
  id: string
  label: string
  edgeTypeId: string
  source: string
  target: string
}

export interface DashboardCanvasAnnotation {
  nodeId: string
  type: "error" | "warning" | "info"
  label: string
}

export interface DashboardGraphCanvasModel {
  graphId: string
  graphName: string
  nodes: DashboardCanvasNode[]
  edges: DashboardCanvasEdge[]
  nodeAnnotations: DashboardCanvasAnnotation[]
  edgeIssueCounts: Record<string, { errors: number; warnings: number }>
}

export function buildGraphCanvasModel(
  projectModel: DashboardProjectModel,
  graphId: string
): DashboardGraphCanvasModel | null {
  const graph = projectModel.catalogs.graphById[graphId]
  if (!graph) {
    return null
  }

  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    label: readDisplayLabel(node, "title"),
    nodeTypeId: node.type,
    isEnding: graph.endingNodeIds.includes(node.id),
  }))

  const edges = graph.edges.map((edge) => ({
    id: edge.id,
    label: readDisplayLabel(edge, "text"),
    edgeTypeId: edge.type,
    source: edge.source,
    target: edge.target,
  }))

  return {
    graphId: graph.id,
    graphName: graph.name,
    nodes,
    edges,
    nodeAnnotations: buildNodeAnnotations(nodes, graph.errors, graph.warnings),
    edgeIssueCounts: buildEdgeIssueCounts(edges.map((edge) => edge.id), graph.errors, graph.warnings),
  }
}

function buildNodeAnnotations(
  nodes: DashboardCanvasNode[],
  errors: DevServerValidationIssue[],
  warnings: DevServerValidationIssue[]
): DashboardCanvasAnnotation[] {
  const annotations: DashboardCanvasAnnotation[] = []

  for (const node of nodes) {
    const errorCount = errors.filter((issue) => issue.nodeId === node.id).length
    const warningCount = warnings.filter((issue) => issue.nodeId === node.id).length

    if (errorCount > 0) {
      annotations.push({
        nodeId: node.id,
        type: "error",
        label: formatIssueCount(errorCount, "error"),
      })
    } else if (warningCount > 0) {
      annotations.push({
        nodeId: node.id,
        type: "warning",
        label: formatIssueCount(warningCount, "warning"),
      })
    }

    if (node.isEnding) {
      annotations.push({
        nodeId: node.id,
        type: "info",
        label: "Ending",
      })
    }
  }

  return annotations
}

function buildEdgeIssueCounts(
  edgeIds: string[],
  errors: DevServerValidationIssue[],
  warnings: DevServerValidationIssue[]
): Record<string, { errors: number; warnings: number }> {
  const counts: Record<string, { errors: number; warnings: number }> = {}

  for (const edgeId of edgeIds) {
    counts[edgeId] = {
      errors: errors.filter((issue) => issue.edgeId === edgeId).length,
      warnings: warnings.filter((issue) => issue.edgeId === edgeId).length,
    }
  }

  return counts
}

function formatIssueCount(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? "" : "s"}`
}

function readDisplayLabel(
  value: Record<string, unknown>,
  preferredKey: string
): string {
  const preferred = value[preferredKey]
  if (typeof preferred === "string" && preferred.trim()) {
    return preferred
  }

  return String(value.id)
}
