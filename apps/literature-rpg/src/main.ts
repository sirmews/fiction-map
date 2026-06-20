import readline from "node:readline"
import { applyIntent, computeFrame } from "@fiction-map/protocol"
import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
} from "@fiction-map/runtime"
import { story } from "./graphs/story.graph"
import { registry } from "./project"
import { world } from "./world"

registerBuiltins(registry)

export const runtime = createRuntimeFromGraph(story)

// Global Triggers
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

export function startSidecar() {
  let state = createInitialState(runtime.startNodeId)

  // Output initial frame immediately
  const initialContext = { derivedState: deriveEntityState(world, state) }
  const initialFrame = computeFrame(runtime, state, initialContext, world)
  console.log(JSON.stringify(initialFrame))

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  rl.on("line", (line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    try {
      const intent = JSON.parse(trimmed)
      const result = applyIntent(runtime, state, intent, world)

      state = result.state

      // Output next frame
      console.log(JSON.stringify(result.frame))

      if (result.exit) {
        process.exit(0)
      }
    } catch (e) {
      console.error(JSON.stringify({ error: `Sidecar error: ${(e as Error).message}` }))
    }
  })
}

// Only run when invoked directly
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors)
    process.exit(1)
  }

  startSidecar()
}
