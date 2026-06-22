import { createRuntimeFromGraph } from "@fiction-map/runtime"
import type { FailedCondition, Transition, TransitionResult, TransitionTrace, GraphRuntimeState } from "@fiction-map/runtime"
import { createInterface } from "node:readline/promises"
import { loadMetadata, selectGraphs } from "./query"

interface DebugCommandIO {
  prompt: (message: string) => Promise<string>
  log: (...values: unknown[]) => void
  close?: () => void | Promise<void>
}

function createDefaultIO(): DebugCommandIO {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return {
    prompt: (message: string): Promise<string> => rl.question(message),
    log: (...values: unknown[]) => console.log(...values),
    close: () => rl.close(),
  }
}

export interface DebugOptions {
  rootDir?: string
  outputDir?: string
  io?: DebugCommandIO
}

interface IndexedTransition {
  index: number
  transition: Transition
  status: "available" | "blocked" | "hidden"
}

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

function stringifyValue(value: unknown): string {
  return typeof value === "string" ? JSON.stringify(value) : JSON.stringify(value)
}

function stringifyCondition(condition: { type: string; [key: string]: unknown }): string {
  const args = Object.entries(condition)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key}=${stringifyValue(value)}`)
    .join(", ")

  return args.length > 0 ? `${condition.type}(${args})` : condition.type
}

function stringifyConditionSet(conditionSet: unknown | undefined, fallbackLabel: string): string {
  if (!conditionSet || typeof conditionSet !== "object") {
    return fallbackLabel
  }

  const parts: string[] = []
  const cast = conditionSet as {
    all?: Array<{ type: string; [key: string]: unknown }>
    any?: Array<{ type: string; [key: string]: unknown }>
    none?: Array<{ type: string; [key: string]: unknown }>
  }

  if (cast.all?.length) {
    parts.push(`all: [${cast.all.map(stringifyCondition).join(", ")}]`)
  }
  if (cast.any?.length) {
    parts.push(`any: [${cast.any.map(stringifyCondition).join(", ")}]`)
  }
  if (cast.none?.length) {
    parts.push(`none: [${cast.none.map(stringifyCondition).join(", ")}]`)
  }

  return parts.length > 0 ? parts.join(" | ") : fallbackLabel
}

function stringifyEffect(effect: { type: string; [key: string]: unknown }): string {
  const args = Object.entries(effect)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key}=${stringifyValue(value)}`)
    .join(", ")

  return args.length > 0 ? `${effect.type}(${args})` : effect.type
}

function stringifyEffectList(effects: unknown[] | undefined): string {
  if (!effects || effects.length === 0) return "(none)"
  return effects.map((effect) => stringifyEffect(effect as { type: string; [key: string]: unknown })).join(", ")
}

function transitionLabel(transition: Transition): string {
  const target = transition.targetNodeId || "(no target)"
  const label = transition.label || transition.id
  return `${transition.id} (${transition.sourceNodeId} -> ${target}) ${label}`
}

function renderState(state: GraphRuntimeState): string {
  const entityState = state.entityState
  return [
    `Current node: ${state.currentNodeId}`,
    `History: ${state.history.join(" -> ") || "(empty)"}`,
    `Variables: ${JSON.stringify(state.variables) || "{}"}`,
    `Flags: ${JSON.stringify(state.flags) || "{}"}`,
    `Visited: ${JSON.stringify(Array.from(state.visited))}`,
    `Resources: ${JSON.stringify(entityState?.resources || {})}`,
  ].join("\n")
}

function formatFailedConditions(failed: FailedCondition[] | undefined, prefix: string): string[] {
  if (!failed || failed.length === 0) return [`${prefix} none`]

  return failed.map(
    (entry) =>
      `${prefix} [${entry.scope}.${entry.group}] ${stringifyCondition(entry.condition as { type: string; [key: string]: unknown })}`,
  )
}

function formatTrace(trace: TransitionTrace | undefined, prefix: string): string[] {
  if (!trace) return []
  const rows: string[] = []

  for (const cond of trace.conditionsEvaluated) {
    rows.push(
      `${prefix} [condition] ${stringifyCondition(cond.condition as { type: string; [key: string]: unknown })} => ${
        cond.result ? "pass" : "fail"
      } (${cond.evaluator})`,
    )
  }

  for (const effect of trace.effectsApplied) {
    rows.push(`${prefix} [effect] ${stringifyEffect(effect.effect)} via ${effect.handler}`)
  }

  return rows
}

function groupTransitions(transitions: IndexedTransition[]): {
  available: IndexedTransition[]
  blocked: IndexedTransition[]
  hidden: IndexedTransition[]
} {
  return {
    available: transitions.filter((entry) => entry.status === "available"),
    blocked: transitions.filter((entry) => entry.status === "blocked"),
    hidden: transitions.filter((entry) => entry.status === "hidden"),
  }
}

function indexTransitions(available: Transition[], blocked: Transition[], hidden: Transition[]): IndexedTransition[] {
  const entries: IndexedTransition[] = []
  let index = 1

  for (const transition of available) {
    entries.push({ index: index++, transition, status: "available" })
  }
  for (const transition of blocked) {
    entries.push({ index: index++, transition, status: "blocked" })
  }
  for (const transition of hidden) {
    entries.push({ index: index++, transition, status: "hidden" })
  }

  return entries
}

function printTransitionSummary(entries: IndexedTransition[], log: (...values: unknown[]) => void): void {
  const grouped = groupTransitions(entries)

  log("")
  log("Transitions:")
  if (grouped.available.length === 0 && grouped.blocked.length === 0 && grouped.hidden.length === 0) {
    log("  (none)")
    return
  }

  for (const bucket of grouped.available) {
    const line =
      `[${bucket.index}] [available] ${transitionLabel(bucket.transition)} ` +
      `cond: ${stringifyConditionSet(bucket.transition.requirements, "true")}, ` +
      `eff: ${stringifyEffectList(bucket.transition.effects)}`
    log(`  ${line}`)
  }

  for (const bucket of grouped.blocked) {
    const line =
      `[${bucket.index}] [blocked] ${transitionLabel(bucket.transition)} ` +
      `cond: ${stringifyConditionSet(bucket.transition.requirements, "true")}, ` +
      `eff: ${stringifyEffectList(bucket.transition.effects)}`
    log(`  ${line}`)
  }

  for (const bucket of grouped.hidden) {
    const line =
      `[${bucket.index}] [hidden] ${transitionLabel(bucket.transition)} ` +
      `cond: ${stringifyConditionSet(bucket.transition.requirements, "true")}, ` +
      `eff: ${stringifyEffectList(bucket.transition.effects)}`
    log(`  ${line}`)
  }
}

function printHelp(log: (...values: unknown[]) => void): void {
  log("Commands:")
  log("  help               show this help")
  log("  state              show current runtime state")
  log("  available, a       list available/blocked/hidden transitions")
  log("  step <index|id>    apply an available transition")
  log("  explain <index|id> explain why a transition is blocked/hidden")
  log("  reset              reset state to start node")
  log("  quit               exit the session")
}

function printStepResult(
  transition: Transition,
  result: TransitionResult,
  beforeState: GraphRuntimeState,
  log: (...values: unknown[]) => void,
): void {
  log("")
  log(`Applying ${transition.id}...`)

  if (result.success) {
    log(`✅ transition succeeded -> ${result.nextNodeId ?? transition.targetNodeId ?? "(none)"}`)
  } else {
    log(`✖ transition failed: ${result.failureReason ?? "Unknown reason"}`)
  }

  if (result.failedConditions && result.failedConditions.length > 0) {
    for (const line of formatFailedConditions(result.failedConditions, "  failed")) {
      log(line)
    }
  }

  const traceLines = formatTrace(result.trace, "  ")
  if (traceLines.length > 0) {
    log("  trace:")
    for (const row of traceLines) {
      log(row)
    }
  }

  if (beforeState.currentNodeId !== result.state.currentNodeId) {
    log(`  node: ${beforeState.currentNodeId} -> ${result.state.currentNodeId}`)
  }
}

function resolveTransition(
  selector: string,
  candidates: IndexedTransition[],
): IndexedTransition | undefined {
  const maybeNumber = Number.parseInt(selector, 10)
  if (!Number.isNaN(maybeNumber) && `${maybeNumber}` === selector.trim()) {
    return candidates.find((entry) => entry.index === maybeNumber)
  }

  return candidates.find(
    (entry) => entry.transition.id === selector || transitionLabel(entry.transition) === selector,
  )
}

export async function debug(graphId: string | undefined, options: DebugOptions = {}): Promise<void> {
  if (!graphId) {
    fail("❌ Missing graph id. Usage: `fiction-map debug <graph-id>`")
  }

  const { metadata } = await loadMetadata({
    rootDir: options.rootDir,
    outputDir: options.outputDir,
  })
  const graph = selectGraphs(metadata, graphId)[0]

  const io = options.io ?? createDefaultIO()
  const log = io.log

  const runtime = createRuntimeFromGraph(graph)
  let state = runtime.createState()

  io.log(`Interactive debug: ${graph.id}`)
  io.log(`Start: ${runtime.startNodeId}`)
  io.log("Type `help` to list commands.")

  let closed = false

  const close = async (): Promise<void> => {
    if (closed) return
    closed = true
    if (io.close) {
      await io.close()
    }
  }

  try {
    while (true) {
      const availability = runtime.getByAvailability(state)
      const indexed = indexTransitions(
        availability.available,
        availability.blocked,
        availability.hidden,
      )
      printTransitionSummary(indexed, log)

      const input = await io.prompt("debug> ")
      const raw = input.trim()

      if (!raw) {
        continue
      }

      const [command, ...rest] = raw.split(/\s+/)
      const normalized = command.toLowerCase()
      if (normalized === "quit" || normalized === "exit") {
        log("bye")
        return close()
      }

      if (normalized === "help") {
        printHelp(log)
        continue
      }

      if (normalized === "state" || normalized === "s") {
        log("")
        log(renderState(state))
        continue
      }

      if (normalized === "available" || normalized === "a") {
        continue
      }

      if (normalized === "reset" || normalized === "r") {
        state = runtime.createState()
        log("State has been reset.")
        continue
      }

      if (normalized === "explain" || normalized === "x") {
        const selector = rest[0]
        if (!selector) {
          log("Usage: explain <index|id>")
          continue
        }

        const entry = resolveTransition(selector, indexed)
        if (!entry) {
          log("Unknown transition reference.")
          continue
        }

        const result = runtime.step(state, entry.transition)
        log(`\nExplain ${entry.transition.id} (${entry.status}):`)
        if (result.success) {
          log("  transition is available")
        } else {
          log(`  reason: ${result.failureReason ?? "unknown"}`)
          const lines = formatFailedConditions(result.failedConditions, "  failed:")
          for (const line of lines) {
            log(line)
          }
          for (const line of formatTrace(result.trace, "  ")) {
            log(line)
          }
        }
        continue
      }

      if (normalized === "step" || normalized === "do") {
        const selector = rest[0]
        if (!selector) {
          log("Usage: step <index|id>")
          continue
        }

        const entry = resolveTransition(selector, indexed.filter((item) => item.status === "available"))
        if (!entry) {
          log("Unknown available transition. Use `available` to list options.")
          continue
        }

        const beforeState = state
        const result = runtime.step(beforeState, entry.transition)
        state = result.state
        printStepResult(entry.transition, result, beforeState, log)
        log(renderState(state))
        continue
      }

      log("Unknown command. Use `help` for command list.")
    }
  } finally {
    await close()
  }
}
