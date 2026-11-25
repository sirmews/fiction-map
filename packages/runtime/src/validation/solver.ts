import type { GraphRuntime } from "../runtime"
import { wasm } from "../wasm"
import type { SemanticValidationOptions, SemanticValidationResult } from "./types"

export function solveGraphSemantics(
  runtime: GraphRuntime,
  world: any, // WorldDefinition
  options: SemanticValidationOptions = {},
): SemanticValidationResult {
  return wasm.solveGraphSemantics(runtime, world, options) as SemanticValidationResult
}
