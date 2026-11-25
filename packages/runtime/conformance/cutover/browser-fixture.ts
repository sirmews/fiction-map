import {
  deserializeState,
  GraphRuntime,
  RuntimeError,
  serializeState,
  setVariable,
} from "@fiction-map/runtime"
import save from "./save-v1.json"

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

export function runBrowserContract() {
  const opaque = Symbol("opaque")
  const context = { opaque }
  const events: string[] = []
  const restored = deserializeState({ ...save, schemaVersion: 1 })
  check(restored.currentNodeId === "entrance", "v1 save restores the current node")
  check(restored.visited instanceof Set && restored.visited.size === 2, "v1 save restores visits")
  check(
    Object.getPrototypeOf(restored.variables) === null,
    "v1 save restores null-prototype variables",
  )
  let schemaError: unknown
  try {
    deserializeState({ ...serializeState(restored), schemaVersion: 99 as 1 })
  } catch (error) {
    schemaError = error
  }
  check(
    schemaError instanceof RuntimeError && schemaError.code === "ERR_RUNTIME_SCHEMA_MISMATCH",
    "unknown save versions report a schema mismatch",
  )

  const graph = new GraphRuntime(
    {
      nodes: [{ id: "entrance" }, { id: "end" }],
      edges: [
        {
          id: "continue",
          source: "entrance",
          target: "end",
          conditions: [{ type: "checkOpaque" }],
          effects: [{ type: "writeOpaque" }],
        },
      ],
    },
    new Map([
      [
        "checkOpaque",
        (state, _condition, receivedContext) => {
          events.push("condition")
          check(state === restored, "condition receives the original state")
          return receivedContext?.opaque === opaque
        },
      ],
    ]),
    new Map([
      [
        "writeOpaque",
        (state, _effect, receivedContext) => {
          events.push("effect")
          check(state !== restored, "effect receives a cloned state")
          return setVariable(state, "opaque", receivedContext?.opaque)
        },
      ],
    ]),
  )

  const step = graph.step(restored, graph.transitions[0], context)
  check(step.success && step.nextNodeId === "end", "custom callback transition navigates")
  check(step.state.variables.opaque === opaque, "custom callback retains opaque identity")
  check(events.join(",") === "condition,effect", "custom callbacks run in order")
  check(!Object.hasOwn(restored.variables, "opaque"), "original save state is unchanged")
  return true
}
