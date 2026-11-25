import type { GraphRuntimeState } from "../types"
import { wasm } from "../wasm"

export function evaluateFormula(formula: string, state: GraphRuntimeState): number {
  return wasm.evaluateFormula(formula, state)
}
