import { RuntimeError } from "@fiction-map/core"
import { type GraphBlueprint, type ParsedGraph, parseGraph } from "./adapter"
import { cloneState, createInitialState } from "./core/state"
import {
  applyTransition,
  getAvailableTransitions,
  getTransitionsByAvailability,
} from "./core/transition"
import { validateGraph } from "./core/validation"
import { builtinEvaluators, builtinHandlers } from "./default-bindings"
import { applyEffects } from "./effects"
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
    const result = applyTransition(state, transition, this.evaluators, this.handlers, context)

    if (!result.success || !result.state) {
      return result
    }

    let updatedState = result.state
    const maxIterations = 5
    let iterations = 0
    let triggerFired = false
    const firedTriggerIds = new Set<string>()

    do {
      triggerFired = false
      const currentContext = context
        ? { ...context, derivedState: context.derivedState }
        : undefined

      for (const trigger of this.triggers) {
        if (firedTriggerIds.has(trigger.id)) {
          continue
        }

        let passed = true
        for (const cond of trigger.conditions) {
          const condEvaluator = this.evaluators.get(cond.type)
          if (!condEvaluator?.(updatedState, cond, currentContext)) {
            passed = false
            break
          }
        }

        if (passed) {
          firedTriggerIds.add(trigger.id)
          for (const effect of trigger.effects) {
            const effectHandler = this.handlers.get(effect.type)
            if (effectHandler) {
              updatedState = effectHandler(updatedState, effect, currentContext)
            }
          }
          triggerFired = true
          break
        }
      }

      iterations++
    } while (triggerFired && iterations < maxIterations)

    // Auto-resolve loop for Compute Nodes
    const maxAutoSteps = 100
    let autoSteps = 0

    while (true) {
      const currentNode = this.nodes.get(updatedState.currentNodeId)
      if (!currentNode?.autoResolve) {
        break
      }

      if (autoSteps >= maxAutoSteps) {
        throw new RuntimeError(
          `Infinite loop detected: exceeded ${maxAutoSteps} automatic transitions at node "${updatedState.currentNodeId}"`,
          "ERR_RUNTIME_INFINITE_LOOP",
        )
      }
      autoSteps++

      // a) Apply any enterEffects
      if (currentNode.enterEffects && currentNode.enterEffects.length > 0) {
        const currentContext = context ? { ...context } : undefined
        updatedState = applyEffects(
          updatedState,
          currentNode.enterEffects,
          this.handlers,
          currentContext,
        )
      }

      // b) Evaluate requirements on outgoing edges & c) Automatically traverse the first valid edge
      const available = this.getAvailable(updatedState, context)
      if (available.length === 0) {
        break
      }

      const autoTransition = available[0]
      const autoResult = applyTransition(
        updatedState,
        autoTransition,
        this.evaluators,
        this.handlers,
        context,
      )
      if (!autoResult.success || !autoResult.state) {
        break
      }

      updatedState = autoResult.state
    }

    return {
      ...result,
      state: updatedState,
      nextNodeId: updatedState.currentNodeId,
    }
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
    const steps: StepResult[] = []

    for (let i = 0; i < maxSteps; i++) {
      const context = makeContext(state)
      const available = this.getAvailable(state, context)

      if (available.length === 0) {
        steps.push({
          state: cloneState(state),
          nodeId: state.currentNodeId,
          available: [],
          applied: null,
        })
        break
      }

      const result = this.step(state, available[0], context)

      const stepResult: StepResult = {
        state: result.state,
        nodeId: result.state.currentNodeId,
        available,
        applied: result,
      }

      steps.push(stepResult)

      // Update state for the next iteration
      state = result.state
    }

    return steps
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
    const steps: StepResult[] = []

    for (let i = 0; i < maxSteps; i++) {
      const available = this.getAvailable(state, context)

      if (available.length === 0) {
        steps.push({
          state: cloneState(state),
          nodeId: state.currentNodeId,
          available: [],
          applied: null,
        })
        break
      }

      const result = this.step(state, available[0], context)
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
    maxPaths: number = 100,
    context?: EvaluationContext & EffectContext,
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

      const available = this.getAvailable(state, context)

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
        const result = this.step(state, transition, context)
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
    return validateGraph(this.parsed.nodes, this.parsed.transitions, this.parsed.startNodeId)
  }
}
