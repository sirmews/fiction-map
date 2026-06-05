import { useState, useCallback, useMemo } from 'react';
import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
  GraphRuntimeState,
  Transition,
} from "@fiction-map/runtime";
import { story } from "../../../literature-rpg/src/graphs/story.graph";
import { registry } from "../../../literature-rpg/src/project";
import { world } from "../../../literature-rpg/src/world";

registerBuiltins(registry);

export const runtime = createRuntimeFromGraph(story);

export function useStoryRuntime() {
  const [state, setState] = useState<GraphRuntimeState>(() => 
    createInitialState(runtime.startNodeId)
  );

  const context = useMemo(() => {
    return { derivedState: deriveEntityState(world, state) };
  }, [state]);

  const currentNode = runtime.nodes.get(state.currentNodeId);
  const availableChoices = runtime.getAvailable(state, context);

  const step = useCallback((choice: Transition) => {
    const result = runtime.step(state, choice, context);
    if (result.success) {
      setState(result.state);
    } else {
      console.error("Transition failed:", result.failureReason);
    }
  }, [state, context]);

  const reset = useCallback(() => {
    setState(createInitialState(runtime.startNodeId));
  }, []);

  return {
    state,
    context,
    currentNode,
    availableChoices,
    step,
    reset,
    world
  };
}
