import type { Node, Edge } from "@xyflow/react";
import type { LayoutConfig } from "../types";
import { DEFAULT_LAYOUT_CONFIG } from "../types";

/**
 * Build node levels using BFS from nodes with no incoming edges.
 * 
 * This is the core layout algorithm extracted from Tale Weaver's story-flow-editor.tsx.
 * Nodes are assigned a "level" (column) based on their distance from start nodes.
 * 
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @returns Map of node ID → level (0-based, left-to-right)
 */
export function buildNodeLevels(
  nodes: Node[],
  edges: Edge[]
): Map<string, number> {
  const levels = new Map<string, number>();
  const incoming = countIncomingEdges(edges);
  const outgoing = buildOutgoingIndex(edges);
  const queue: string[] = [];
  
  // Start with nodes that have no incoming edges
  for (const node of nodes) {
    if ((incoming.get(node.id) ?? 0) === 0) {
      queue.push(node.id);
      levels.set(node.id, 0);
    }
  }
  
  // If no nodes have zero incoming edges (cycle), start with first node
  if (queue.length === 0 && nodes.length > 0) {
    queue.push(nodes[0].id);
    levels.set(nodes[0].id, 0);
  }
  
  // BFS traversal
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLevel = levels.get(currentId) ?? 0;
    
    const targets = outgoing.get(currentId) ?? [];
    for (const targetId of targets) {
      if (!levels.has(targetId)) {
        levels.set(targetId, currentLevel + 1);
        queue.push(targetId);
      }
    }
  }
  
  // Handle any remaining nodes (disconnected components)
  for (const node of nodes) {
    if (!levels.has(node.id)) {
      levels.set(node.id, 0);
    }
  }
  
  return levels;
}

/**
 * Calculate positions for nodes based on their levels.
 * 
 * @param nodes - All nodes in the graph
 * @param edges - All edges in the graph
 * @param config - Layout configuration
 * @returns Map of node ID → { x, y } position
 */
export function calculateNodePositions(
  nodes: Node[],
  edges: Edge[],
  config: Partial<LayoutConfig> = {}
): Map<string, { x: number; y: number }> {
  const fullConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const { direction, nodeWidth, nodeHeight, horizontalGap, verticalGap, padding } = fullConfig;
  
  const levels = buildNodeLevels(nodes, edges);
  const positions = new Map<string, { x: number; y: number }>();
  
  // Group nodes by level
  const nodesByLevel = new Map<number, Node[]>();
  for (const node of nodes) {
    const level = levels.get(node.id) ?? 0;
    const bucket = nodesByLevel.get(level) ?? [];
    bucket.push(node);
    nodesByLevel.set(level, bucket);
  }
  
  // Calculate positions
  for (const [level, levelNodes] of nodesByLevel) {
    // Sort nodes within level for consistent ordering
    levelNodes.sort((a, b) => a.id.localeCompare(b.id));
    
    const rowCount = levelNodes.length;
    
    levelNodes.forEach((node, rowIndex) => {
      let x: number;
      let y: number;
      
      if (direction === "LR") {
        // Left-to-right: levels are columns
        x = padding + level * (nodeWidth + horizontalGap);
        y = padding + (rowIndex - (rowCount - 1) / 2) * (nodeHeight + verticalGap);
      } else {
        // Top-to-bottom: levels are rows
        x = padding + (rowIndex - (rowCount - 1) / 2) * (nodeWidth + horizontalGap);
        y = padding + level * (nodeHeight + verticalGap);
      }
      
      positions.set(node.id, { x, y });
    });
  }
  
  return positions;
}

/**
 * Apply auto-layout positions to nodes.
 * 
 * @param nodes - Nodes to update
 * @param edges - All edges in the graph
 * @param config - Layout configuration
 * @returns Nodes with updated positions
 */
export function applyAutoLayout(
  nodes: Node[],
  edges: Edge[],
  config: Partial<LayoutConfig> = {}
): Node[] {
  const positions = calculateNodePositions(nodes, edges, config);
  
  return nodes.map((node) => {
    const position = positions.get(node.id) ?? node.position;
    return {
      ...node,
      position,
    };
  });
}

/**
 * Count incoming edges for each node.
 */
function countIncomingEdges(edges: Edge[]): Map<string, number> {
  const incoming = new Map<string, number>();
  
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
  }
  
  return incoming;
}

/**
 * Build index of outgoing edges: source → targets.
 */
function buildOutgoingIndex(edges: Edge[]): Map<string, string[]> {
  const outgoing = new Map<string, string[]>();
  
  for (const edge of edges) {
    const targets = outgoing.get(edge.source) ?? [];
    targets.push(edge.target);
    outgoing.set(edge.source, targets);
  }
  
  return outgoing;
}

/**
 * Get the bounding box of all nodes.
 * 
 * @param nodes - All nodes
 * @param config - Layout configuration
 * @returns { width, height } of the bounding box
 */
export function getGraphBounds(
  nodes: Node[],
  config: Partial<LayoutConfig> = {}
): { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number } {
  const fullConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  const { nodeWidth, nodeHeight, padding } = fullConfig;
  
  if (nodes.length === 0) {
    return { width: 0, height: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + nodeWidth);
    maxY = Math.max(maxY, node.position.y + nodeHeight);
  }
  
  return {
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
    minX,
    minY,
    maxX,
    maxY,
  };
}
