import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  type GraphRuntimeState,
  registerBuiltins,
  type Transition,
} from "@fiction-map/runtime"
import { useCallback, useMemo, useState } from "react"
import { story } from "../../../literature-rpg/src/graphs/story.graph"
import { registry } from "../../../literature-rpg/src/project"
import { world } from "../../../literature-rpg/src/world"

registerBuiltins(registry)

export const runtime = createRuntimeFromGraph(story)

runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [],
  effects: [{ type: "addResource", key: "turns", amount: 1 }],
})

runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [{ type: "resourceAtLeast", key: "turns", value: 11 }],
  effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
})

runtime.addTrigger({
  id: "death-trigger",
  conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
  effects: [{ type: "navigate", nodeId: "death" }],
})

runtime.addTrigger({
  id: "mana-regen-trigger",
  conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
  effects: [{ type: "addResource", key: "mana", amount: 5 }],
})

runtime.addTrigger({
  id: "cooldown-tick-trigger",
  conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
  effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
})

export function useStoryRuntime() {
  const [state, setState] = useState<GraphRuntimeState>(() =>
    createInitialState(runtime.startNodeId),
  )

  const context = useMemo(() => {
    return { derivedState: deriveEntityState(world, state) }
  }, [state])

  const currentNode = runtime.nodes.get(state.currentNodeId)
  const availableChoices = runtime.getAvailable(state, context)

  const step = useCallback(
    (choice: Transition) => {
      const result = runtime.step(state, choice, context)
      if (result.success) {
        setState(result.state)
      } else {
        console.error("Transition failed:", result.failureReason)
      }
    },
    [state, context],
  )

  const reset = useCallback(() => {
    setState(createInitialState(runtime.startNodeId))
  }, [])

  return {
    state,
    context,
    currentNode,
    availableChoices,
    step,
    reset,
    world,
  }
}
