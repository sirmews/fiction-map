import type { GraphRuntime } from "../runtime"
import { solveGraphSemantics } from "./solver"
import type { SemanticValidationOptions, SemanticValidationResult } from "./types"

export * from "./solver"
export * from "./symbolicState"
export * from "./types"

/**
 * Statically validates the semantic and behavioral correctness of a story graph.
 *
 * Simulates all possible traversals under the game rules, triggers, and resource
 * constraints to detect dead ends, unwinnable paths, and infinite resource-draining loops.
 *
 * @param runtime - The compiled GraphRuntime instance
 * @param world - The WorldDefinition containing entity schemas and instances
 * @param options - Optional validation settings (limits, terminal thresholds)
 */
export function validateGraphSemantics(
  runtime: GraphRuntime,
  world: any,
  options?: SemanticValidationOptions,
): SemanticValidationResult {
  return solveGraphSemantics(runtime, world, options)
}
