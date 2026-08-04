import { randomUUID } from "node:crypto"
import readline from "node:readline"
import { applyIntent, computeFrame } from "@fiction-map/protocol"
import {
  createInitialState,
  createRuntimeFromGraph,
  deriveEntityState,
  registerBuiltins,
} from "@fiction-map/runtime"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { story } from "./graphs/story.graph"
import { registry } from "./project"
import { world } from "./world"

registerBuiltins(registry)

export const runtime = createRuntimeFromGraph(story)
export { registry } from "./project"
export { world } from "./world"

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

export function startHttpServer(port = Number(process.env.PORT) || 8080) {
  const app = new Hono()
  app.use("*", cors())

  // In-memory session store
  const sessions = new Map<string, any>()

  app.get("/health", (c) => c.json({ status: "ok" }))

  app.post("/intent", async (c) => {
    try {
      let body: any = {}
      try {
        body = await c.req.json()
      } catch (_) {}
      let sessionId = body.sessionId
      const intent = body.intent

      if (!sessionId) {
        sessionId = randomUUID()
      }

      let state = sessions.get(sessionId)
      if (!state) {
        state = createInitialState(runtime.startNodeId)
        sessions.set(sessionId, state)
      }

      if (intent) {
        const result = applyIntent(runtime, state, intent, world)
        if (result.error) {
          return c.json({ error: result.error }, 400)
        }
        state = result.state
        sessions.set(sessionId, state)
        return c.json({ frame: result.frame, sessionId })
      } else {
        // No intent provided, just return the current frame
        const context = { derivedState: deriveEntityState(world, state) }
        const frame = computeFrame(runtime, state, context, world)
        return c.json({ frame, sessionId })
      }
    } catch (e) {
      return c.json({ error: (e as Error).message }, 500)
    }
  })

  console.log(`HTTP Server starting on port ${port}...`)
  const server = Bun.serve({
    port,
    fetch: app.fetch,
  })
  return server
}

// Only run when invoked directly
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors)
    process.exit(1)
  }

  const isHttp = process.argv.includes("--http") || !!process.env.PORT
  if (isHttp) {
    const portArgIndex = process.argv.indexOf("--port")
    let port = Number(process.env.PORT) || 8080
    if (portArgIndex !== -1 && portArgIndex + 1 < process.argv.length) {
      port = Number(process.argv[portArgIndex + 1]) || port
    }
    startHttpServer(port)
  } else {
    startSidecar()
  }
}
