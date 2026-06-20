import type { GraphRuntime, GraphRuntimeState } from "@fiction-map/runtime"
import { deriveEntityState, deserializeState, mergeState } from "@fiction-map/runtime"
import type { Frame, Intent } from "./generated/protocol"
import { computeFrame } from "./presenter"

export interface ApplyIntentResult {
  frame: Frame
  state: GraphRuntimeState
  exit?: boolean
  error?: string
}

/**
 * Pure, transport-agnostic session reducer that applies a user Intent to the current state.
 *
 * @param runtime - The active GraphRuntime instance
 * @param state - The current GraphRuntimeState
 * @param intent - The user Intent to apply
 * @param world - Optional world definition to dynamically recompute derived context
 */
export function applyIntent(
  runtime: GraphRuntime,
  state: GraphRuntimeState,
  intent: Intent,
  world?: { entities: { id: string; label?: string }[] },
): ApplyIntentResult {
  // Helper to dynamically compute derived context to prevent stale-trigger bugs
  const getContext = (s: GraphRuntimeState) => {
    return {
      derivedState: world
        ? deriveEntityState(world as any, s)
        : {
            ownedEntityIds: new Set<string>(),
            activeEntityIds: new Set<string>(),
            unlockedEntityIds: new Set<string>(),
            effectiveEntityIds: new Set<string>(),
            activeModifiers: [],
            prerequisites: [],
            missingEntityIds: new Set<string>(),
          },
    }
  }

  let nextState = state
  let exit = false

  try {
    switch (intent.type) {
      case "selectChoice": {
        if (!intent.choiceId) {
          return {
            frame: computeFrame(runtime, state, getContext(state), world),
            state,
            error: "choiceId is required for selectChoice intent",
          }
        }

        const context = getContext(state)
        const availableChoices = runtime.getAvailable(state, context)
        const choice = availableChoices.find((c) => c.id === intent.choiceId)

        if (!choice) {
          return {
            frame: computeFrame(runtime, state, context, world),
            state,
            error: `Choice '${intent.choiceId}' is not available.`,
          }
        }

        const stepResult = runtime.step(state, choice, context)
        if (stepResult.success) {
          // Reset pacing index immutably on successful transition
          nextState = mergeState(stepResult.state, {
            extensions: {
              ...stepResult.state.extensions,
              pacingIndex: 0,
            },
          })
        }
        break
      }

      case "skipPacing": {
        const currentNode = runtime.nodes.get(state.currentNodeId)
        if (currentNode) {
          const blocks = currentNode.blocks ? (currentNode.blocks as any[]) : []
          const maxIndex = Math.max(0, blocks.length - 1)
          nextState = mergeState(state, {
            extensions: {
              ...state.extensions,
              pacingIndex: maxIndex,
            },
          })
        }
        break
      }

      case "save": {
        // Pure reducer returns state unchanged; host is responsible for saving the returned frame.serializedState
        break
      }

      case "load": {
        if (!intent.serializedState) {
          return {
            frame: computeFrame(runtime, state, getContext(state), world),
            state,
            error: "serializedState is required for load intent",
          }
        }
        try {
          const parsed = JSON.parse(intent.serializedState)
          nextState = deserializeState(parsed)
        } catch (e) {
          return {
            frame: computeFrame(runtime, state, getContext(state), world),
            state,
            error: `Failed to deserialize state: ${(e as Error).message}`,
          }
        }
        break
      }

      case "quit": {
        exit = true
        break
      }

      default: {
        return {
          frame: computeFrame(runtime, state, getContext(state), world),
          state,
          error: `Unknown intent type: ${(intent as any).type}`,
        }
      }
    }
  } catch (e) {
    return {
      frame: computeFrame(runtime, state, getContext(state), world),
      state,
      error: `Error applying intent: ${(e as Error).message}`,
    }
  }

  // Compute final frame with fresh, dynamically recomputed context
  const finalContext = getContext(nextState)
  const frame = computeFrame(runtime, nextState, finalContext, world)

  return {
    frame,
    state: nextState,
    exit,
  }
}
