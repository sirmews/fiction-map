import type { GraphRuntime, GraphRuntimeState } from "@fiction-map/runtime"
import { serializeState } from "@fiction-map/runtime"
import type { Frame, FrameChoice, FrameInventoryItem, FrameNodeBlock } from "./generated/protocol"

/**
 * Presenter function that projects the raw engine state into a presentation Frame.
 *
 * @param runtime - The active GraphRuntime instance
 * @param state - The current GraphRuntimeState
 * @param context - The evaluation context containing derived entity state
 * @param world - Optional world definition to resolve entity labels
 */
export function computeFrame(
  runtime: GraphRuntime,
  state: GraphRuntimeState,
  context: { derivedState: any },
  world?: { entities: { id: string; label?: string }[] },
): Frame {
  // 1. Get current node
  const currentNodeId = state.currentNodeId
  const currentNode = runtime.nodes.get(currentNodeId)
  if (!currentNode) {
    throw new Error(`Current Node '${currentNodeId}' not found in runtime.`)
  }

  // 2. Determine pacing index and complete status
  const pacingIndex = (state.extensions?.pacingIndex as number | undefined) ?? 0
  const blocks = currentNode.blocks ? (currentNode.blocks as any[]) : []
  const isPacingComplete = blocks.length === 0 || pacingIndex >= blocks.length - 1

  // 3. Filter blocks based on pacing index
  const activeBlocks: FrameNodeBlock[] = blocks.slice(0, pacingIndex + 1).map((block) => ({
    id: block.id,
    type: block.type as "paragraph" | "header" | "image",
    text: block.text,
    url: block.url,
    caption: block.caption,
    metadata: block.metadata,
  }))

  // 4. Get available choices
  const availableChoices = runtime.getAvailable(state, context)
  const choices: FrameChoice[] = availableChoices.map((choice) => ({
    id: choice.id,
    label: choice.label ?? choice.metadata?.text ?? choice.id,
  }))

  // 5. Map resources
  const resources: Record<string, number> = {}
  if (state.entityState?.resources) {
    for (const [key, val] of Object.entries(state.entityState.resources)) {
      if (typeof val === "number") {
        resources[key] = val
      }
    }
  }

  // 6. Map inventory
  const inventory: FrameInventoryItem[] = []
  if (context.derivedState?.ownedEntityIds) {
    const ownedIds = Array.from(context.derivedState.ownedEntityIds) as string[]
    for (const id of ownedIds) {
      const entity = world?.entities?.find((e) => e.id === id)
      const label = entity?.label ?? id
      inventory.push({ id, label })
    }
  }

  // 7. Map flags
  const flags: Record<string, boolean | string | number> = {}
  if (state.flags) {
    for (const [key, val] of Object.entries(state.flags)) {
      if (typeof val === "boolean" || typeof val === "string" || typeof val === "number") {
        flags[key] = val
      }
    }
  }

  // 8. Map warnings
  const warnings: string[] = []
  const turns = resources.turns ?? 0
  if (turns > 10 && state.currentNodeId !== "death" && state.currentNodeId !== "victory") {
    warnings.push("THE CAVERN IS COLLAPSING! (-25 HP per turn!)")
  }

  // 9. Serialize state
  const serializedState = JSON.stringify(serializeState(state))

  return {
    currentNode: {
      id: currentNodeId,
      type: currentNode.type ?? "",
      blocks: activeBlocks,
    },
    choices,
    resources,
    inventory,
    flags,
    warnings,
    pacing: {
      pacingIndex,
      isComplete: isPacingComplete,
    },
    serializedState,
  }
}
