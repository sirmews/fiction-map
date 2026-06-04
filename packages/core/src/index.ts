/**
 * Fiction Map — Core
 * 
 * A framework for defining graph-based systems.
 */

// Types
export * from "./types"

// Errors
export * from "./errors"

// Registry
export { ProjectRegistry } from "./registry"

// Node Types
export { defineNodeType } from "./node-type"

// Edge Types
export { defineEdgeType } from "./edge-type"

// Conditions
export { defineCondition } from "./condition"

// Effects
export { defineEffect } from "./effect"

// Graph
export { defineGraph, validateGraph, analyzeGraph } from "./graph"
