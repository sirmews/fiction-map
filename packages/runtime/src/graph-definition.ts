import type { GraphDefinition, EdgeInstance } from "@fiction-map/core"
import type {
  ConditionEvaluator,
  EffectHandler,
} from "./types"
import { GraphRuntime } from "./runtime"
import type { EdgeBlueprint, GraphBlueprint } from "./adapter"

const EDGE_RUNTIME_KEYS = new Set([
  "id",
  "source",
  "target",
  "conditions",
  "effects",
  "text",
])

function edgeMetadata(edge: EdgeInstance): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(edge)) {
    if (!EDGE_RUNTIME_KEYS.has(key)) {
      metadata[key] = value
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : undefined
}

function graphEdgeToBlueprint(edge: EdgeInstance): EdgeBlueprint {
  const blueprint: EdgeBlueprint = {
    id: edge.id,
    source: edge.source,
    target: edge.target,
  }

  if (edge.conditions?.length) {
    blueprint.conditions = edge.conditions
  }

  if (Array.isArray(edge.visibility) && edge.visibility.length) {
    blueprint.visibility = edge.visibility as any
  }

  if (edge.effects?.length) {
    blueprint.effects = edge.effects
  }

  if (Array.isArray(edge.failureEffects) && edge.failureEffects.length) {
    blueprint.failureEffects = edge.failureEffects as any
  }

  if (typeof edge.failureTarget === "string") {
    blueprint.failureTarget = edge.failureTarget
  }

  if (typeof edge.text === "string") {
    blueprint.label = edge.text
  }

  const metadata = edgeMetadata(edge)
  if (metadata) {
    blueprint.metadata = metadata
  }

  return blueprint
}

export function graphDefinitionToBlueprint(graph: GraphDefinition): GraphBlueprint {
  return {
    nodes: graph.nodes.map((node) => {
      const { id, type, ...properties } = node as any
      return { id, type, ...properties }
    }),
    edges: graph.edges.map(graphEdgeToBlueprint),
    endings: graph.endings,
  }
}

export function createRuntimeFromGraph(
  graph: GraphDefinition,
  evaluators?: Map<string, ConditionEvaluator>,
  handlers?: Map<string, EffectHandler>
): GraphRuntime {
  return new GraphRuntime(
    graphDefinitionToBlueprint(graph),
    evaluators,
    handlers
  )
}
