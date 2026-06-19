import type { Condition, ContentBlock, Effect, NodeDefinition, Transition } from "./types"

export interface EdgeBlueprint {
  id: string
  source: string
  target?: string
  anchorBlockId?: string
  conditions?: Condition[]
  visibility?: Condition[]
  effects?: Effect[]
  failureEffects?: Effect[]
  failureTarget?: string
  label?: string
  metadata?: Record<string, unknown>
}

export interface NodeBlueprint {
  id: string
  type?: string
  blocks?: ContentBlock[]
  [key: string]: unknown
}

export interface GraphBlueprint {
  nodes: NodeBlueprint[]
  edges: EdgeBlueprint[]
  endings?: string[]
  startNode?: string
}

export interface ParsedGraph {
  transitions: Transition[]
  nodes: Map<string, NodeDefinition>
  startNodeId: string
  endingNodeIds: Set<string>
}

export function parseGraph(blueprint: GraphBlueprint): ParsedGraph {
  const transitions: Transition[] = blueprint.edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    targetNodeId: e.target,
    anchorBlockId: e.anchorBlockId,
    label: e.label,
    requirements: e.conditions?.length ? { all: e.conditions } : undefined,
    visibility: e.visibility?.length ? { all: e.visibility } : undefined,
    effects: e.effects?.length ? e.effects : undefined,
    failureEffects: e.failureEffects?.length ? e.failureEffects : undefined,
    failureTargetNodeId: e.failureTarget,
    metadata: e.metadata,
  }))

  const startNodeId = blueprint.startNode ?? blueprint.nodes[0]?.id

  const endingNodeIds = new Set(
    blueprint.endings ?? findTerminalNodes(blueprint.nodes, transitions),
  )

  const nodes = new Map<string, NodeDefinition>(
    blueprint.nodes.map((n) => {
      const { id, type, blocks, ...properties } = n
      return [id, { id, type, blocks, properties }]
    }),
  )

  return { transitions, nodes, startNodeId, endingNodeIds }
}

function findTerminalNodes(nodes: NodeBlueprint[], transitions: Transition[]): string[] {
  const sources = new Set(transitions.map((t) => t.sourceNodeId))
  return nodes.map((n) => n.id).filter((id) => !sources.has(id) && id !== nodes[0]?.id)
}

export function determineEndings(
  nodes: NodeBlueprint[] | Map<string, NodeDefinition>,
  transitions: Transition[],
): Set<string> {
  const nodeIds = nodes instanceof Map ? new Set(nodes.keys()) : new Set(nodes.map((n) => n.id))

  const sources = new Set(transitions.map((t) => t.sourceNodeId))
  const endings = [...nodeIds].filter((id) => !sources.has(id))

  return new Set(endings)
}
