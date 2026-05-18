import type {
  NodeTypeDefinition,
  EdgeTypeDefinition,
  ConditionDefinition,
  EffectDefinition,
  GraphDefinition,
} from "./types"

export class ProjectRegistry {
  public nodeTypes = new Map<string, NodeTypeDefinition>()
  public edgeTypes = new Map<string, EdgeTypeDefinition>()
  public conditions = new Map<string, ConditionDefinition>()
  public effects = new Map<string, EffectDefinition>()
  public graphs = new Map<string, GraphDefinition>()

  public clear(): void {
    this.nodeTypes.clear()
    this.edgeTypes.clear()
    this.conditions.clear()
    this.effects.clear()
    this.graphs.clear()
  }
}
