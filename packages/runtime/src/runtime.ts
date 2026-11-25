import { RuntimeError } from "@fiction-map/core"
import { type GraphBlueprint, type ParsedGraph, parseGraph } from "./adapter"
import { createInitialState } from "./core/state"
import { getAvailableTransitions, getTransitionsByAvailability } from "./core/transition"
import { validateGraph } from "./core/validation"
import { builtinEvaluators, builtinHandlers } from "./default-bindings"
import type {
  ConditionEvaluator,
  EffectContext,
  EffectHandler,
  EvaluationContext,
  GraphRuntimeState,
  NodeDefinition,
  StateTrigger,
  Transition,
  TransitionResult,
  ValidationResult,
} from "./types"
import { wasm } from "./wasm"

export interface StepResult {
  state: GraphRuntimeState
  nodeId: string
  available: Transition[]
  applied: TransitionResult | null
}

export interface PathStep {
  transitionId: string
  fromNodeId: string
  toNodeId: string
  success: boolean
}

export interface TraversalPath {
  steps: PathStep[]
  finalNodeId: string
  endedAt: string
  state: GraphRuntimeState
}

export class GraphRuntime {
  private parsed: ParsedGraph
  private evaluators: Map<string, ConditionEvaluator>
  private handlers: Map<string, EffectHandler>
  public triggers: StateTrigger[] = []

  constructor(
    blueprint: GraphBlueprint,
    evaluators?: Map<string, ConditionEvaluator>,
    handlers?: Map<string, EffectHandler>,
  ) {
    this.parsed = parseGraph(blueprint)
    this.evaluators = evaluators ?? builtinEvaluators
    this.handlers = handlers ?? builtinHandlers
  }

  addTrigger(trigger: StateTrigger): void {
    this.triggers.push(trigger)
  }

  get transitions(): Transition[] {
    return this.parsed.transitions
  }

  get nodes(): Map<string, NodeDefinition> {
    return this.parsed.nodes
  }

  get startNodeId(): string {
    return this.parsed.startNodeId
  }

  get endingNodeIds(): Set<string> {
    return this.parsed.endingNodeIds
  }

  isEnding(nodeId: string): boolean {
    return this.parsed.endingNodeIds.has(nodeId)
  }

  createState(
    initialVariables?: Record<string, unknown>,
    initialExtensions?: Record<string, unknown>,
  ): GraphRuntimeState {
    return createInitialState(this.parsed.startNodeId, initialVariables, initialExtensions)
  }

  getAvailable(state: GraphRuntimeState, context?: EvaluationContext): Transition[] {
    return getAvailableTransitions(state, this.parsed.transitions, this.evaluators, context)
  }

  getByAvailability(
    state: GraphRuntimeState,
    context?: EvaluationContext,
  ): { available: Transition[]; blocked: Transition[]; hidden: Transition[] } {
    return getTransitionsByAvailability(state, this.parsed.transitions, this.evaluators, context)
  }

  step(
    state: GraphRuntimeState,
    transition: Transition,
    context?: EvaluationContext & EffectContext,
  ): TransitionResult {
    return wasm.runtimeStep(
      this,
      state,
      transition,
      this.evaluators,
      this.handlers,
      context,
      runtimeError,
    ) as TransitionResult
  }

  /**
   * Traverse the graph continuously until no more transitions are available.
   * Useful for derived-state scenarios where the context needs to be recomputed
   * after every step (e.g. updating character stats or entities).
   *
   * @param state - The starting state
   * @param makeContext - A callback invoked before each step to provide the context
   * @param maxSteps - Safety limit (default 100)
   */
  walkWithContext(
    state: GraphRuntimeState,
    makeContext: (state: GraphRuntimeState) => EvaluationContext & EffectContext,
    maxSteps: number = 100,
  ): StepResult[] {
    return wasm.runtimeWalk(this, state, maxSteps, undefined, makeContext) as StepResult[]
  }

  /**
   * Traverse the graph continuously until no more transitions are available.
   * Uses a static context object for the entire walk. For derived-state usage,
   * prefer `walkWithContext`.
   *
   * @param state - The starting state
   * @param maxSteps - Safety limit (default 100)
   * @param context - Static context for the evaluation and effects
   */
  walk(
    state: GraphRuntimeState,
    maxSteps: number = 100,
    context?: EvaluationContext & EffectContext,
  ): StepResult[] {
    return wasm.runtimeWalk(this, state, maxSteps, context, undefined) as StepResult[]
  }

  enumeratePaths(
    maxDepth: number = 50,
    maxPaths: number = 100,
    context?: EvaluationContext & EffectContext,
  ): TraversalPath[] {
    return wasm.runtimeEnumeratePaths(this, maxDepth, maxPaths, context) as TraversalPath[]
  }

  validate(): ValidationResult {
    return validateGraph(this.parsed.nodes, this.parsed.transitions, this.parsed.startNodeId)
  }
}

function runtimeError(message: string, code: string): RuntimeError {
  return new RuntimeError(message, code)
}
