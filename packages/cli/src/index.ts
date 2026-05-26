/**
 * Fiction Map CLI
 */

export { generate } from "./commands/generate"
export { query, showGraph, explain } from "./commands/query"
export { generateMetadata, generateSemantics } from "./generator"
export { discoverFiles, type DiscoveryResult, type DiscoveredFile } from "./generator/discover"
export { extractNodeType, extractEdgeType, extractCondition, extractEffect } from "./generator/extract"
