import type {
  GraphRuntimeState,
  Transition,
  TransitionResult,
  ConditionEvaluator,
  EffectHandler,
  NodeDefinition,
  ValidationResult,
} from "./types"
import {
  createInitialState,
  cloneState,
} from "./core/state"
import {
  getAvailableTransitions,
  getTransitionsByAvailability,
  applyTransition,
} from "./core/transition"
import { validateGraph } from "./core/validation"
import { builtinEvaluators } from "./conditions/builtin"
import { builtinHandlers } from "./effects/builtin"
import {
  parseGraph,
  type GraphBlueprint,
  type ParsedGraph,
} from "./adapter"

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

  constructor(
    blueprint: GraphBlueprint,
    evaluators?: Map<string, ConditionEvaluator>,
    handlers?: Map<string, EffectHandler>
  ) {
    this.parsed = parseGraph(blueprint)
    this.evaluators = evaluators ?? builtinEvaluators
    this.handlers = handlers ?? builtinHandlers
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
    initialExtensions?: Record<string, unknown>
  ): GraphRuntimeState {
    return createInitialState(
      this.parsed.startNodeId,
      initialVariables,
      initialExtensions
    )
  }

  getAvailable(
    state: GraphRuntimeState
  ): Transition[] {
    return getAvailableTransitions(
      state,
      this.parsed.transitions,
      this.evaluators
    )
  }

  getByAvailability(
    state: GraphRuntimeState
  ): { available: Transition[]; blocked: Transition[]; hidden: Transition[] } {
    return getTransitionsByAvailability(
      state,
      this.parsed.transitions,
      this.evaluators
    )
  }

  step(
    state: GraphRuntimeState,
    transition: Transition
  ): TransitionResult {
    return applyTransition(
      state,
      transition,
      this.evaluators,
      this.handlers
    )
  }

  walk(
    state: GraphRuntimeState,
    maxSteps: number = 100
  ): StepResult[] {
    const steps: StepResult[] = []

    for (let i = 0; i < maxSteps; i++) {
      const available = this.getAvailable(state)

      if (available.length === 0) {
        steps.push({
          state: cloneState(state),
          nodeId: state.currentNodeId,
          available: [],
          applied: null,
        })
        break
      }

      const result = this.step(state, available[0])
      steps.push({
        state: cloneState(result.state),
        nodeId: result.state.currentNodeId,
        available,
        applied: result,
      })

      state = result.state
    }

    return steps
  }

  enumeratePaths(
    maxDepth: number = 50,
    maxPaths: number = 100
  ): TraversalPath[] {
    const paths: TraversalPath[] = []
    const startState = this.createState()

    const stack: {
      state: GraphRuntimeState
      steps: PathStep[]
      depth: number
    }[] = [{ state: startState, steps: [], depth: 0 }]

    while (stack.length > 0 && paths.length < maxPaths) {
      const frame = stack.pop()!
      const { state, steps, depth } = frame

      if (depth >= maxDepth) {
        paths.push({
          steps,
          finalNodeId: state.currentNodeId,
          endedAt: "max-depth",
          state: cloneState(state),
        })
        continue
      }

      if (this.isEnding(state.currentNodeId)) {
        paths.push({
          steps,
          finalNodeId: state.currentNodeId,
          endedAt: "ending",
          state: cloneState(state),
        })
        continue
      }

      const available = this.getAvailable(state)

      if (available.length === 0) {
        paths.push({
          steps,
          finalNodeId: state.currentNodeId,
          endedAt: "dead-end",
          state: cloneState(state),
        })
        continue
      }

      const reversed = [...available].reverse()
      for (const transition of reversed) {
        const result = this.step(state, transition)
        stack.push({
          state: result.state,
          steps: [
            ...steps,
            {
              transitionId: transition.id,
              fromNodeId: state.currentNodeId,
              toNodeId: result.nextNodeId ?? state.currentNodeId,
              success: result.success,
            },
          ],
          depth: depth + 1,
        })
      }
    }

    return paths
  }

  validate(): ValidationResult {
    return validateGraph(
      this.parsed.nodes,
      this.parsed.transitions,
      this.parsed.startNodeId
    )
  }
}
