import { describe, it, expect } from "vitest";
import type { Node, Edge } from "@xyflow/react";
import { buildNodeLevels, calculateNodePositions, applyAutoLayout, getGraphBounds } from "./layout";

describe("buildNodeLevels", () => {
  it("assigns level 0 to nodes with no incoming edges", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b" },
    ];
    
    const levels = buildNodeLevels(nodes, edges);
    
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(1);
  });
  
  it("handles multiple start nodes", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
      { id: "c", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "c" },
      { id: "e2", source: "b", target: "c" },
    ];
    
    const levels = buildNodeLevels(nodes, edges);
    
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(0);
    expect(levels.get("c")).toBe(1);
  });
  
  it("handles chains", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
      { id: "c", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "a", target: "b" },
      { id: "e2", source: "b", target: "c" },
    ];
    
    const levels = buildNodeLevels(nodes, edges);
    
    expect(levels.get("a")).toBe(0);
    expect(levels.get("b")).toBe(1);
    expect(levels.get("c")).toBe(2);
  });
  
  it("handles branches", () => {
    const nodes: Node[] = [
      { id: "start", position: { x: 0, y: 0 }, data: {} },
      { id: "left", position: { x: 0, y: 0 }, data: {} },
      { id: "right", position: { x: 0, y: 0 }, data: {} },
      { id: "merge", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "start", target: "left" },
      { id: "e2", source: "start", target: "right" },
      { id: "e3", source: "left", target: "merge" },
      { id: "e4", source: "right", target: "merge" },
    ];
    
    const levels = buildNodeLevels(nodes, edges);
    
    expect(levels.get("start")).toBe(0);
    expect(levels.get("left")).toBe(1);
    expect(levels.get("right")).toBe(1);
    expect(levels.get("merge")).toBe(2);
  });
  
  it("handles empty graph", () => {
    const levels = buildNodeLevels([], []);
    expect(levels.size).toBe(0);
  });
  
  it("handles single node", () => {
    const nodes: Node[] = [{ id: "a", position: { x: 0, y: 0 }, data: {} }];
    const levels = buildNodeLevels(nodes, []);
    
    expect(levels.get("a")).toBe(0);
  });
});

describe("calculateNodePositions", () => {
  it("positions nodes left-to-right by default", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    
    const positions = calculateNodePositions(nodes, edges);
    
    const posA = positions.get("a")!;
    const posB = positions.get("b")!;
    
    expect(posA.x).toBeLessThan(posB.x); // A is left of B
  });
  
  it("positions nodes top-to-bottom when configured", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    
    const positions = calculateNodePositions(nodes, edges, { direction: "TB" });
    
    const posA = positions.get("a")!;
    const posB = positions.get("b")!;
    
    expect(posA.y).toBeLessThan(posB.y); // A is above B
  });
  
  it("centers nodes within a level", () => {
    const nodes: Node[] = [
      { id: "start", position: { x: 0, y: 0 }, data: {} },
      { id: "left", position: { x: 0, y: 0 }, data: {} },
      { id: "right", position: { x: 0, y: 0 }, data: {} },
    ];
    const edges: Edge[] = [
      { id: "e1", source: "start", target: "left" },
      { id: "e2", source: "start", target: "right" },
    ];
    
    const positions = calculateNodePositions(nodes, edges);
    
    const posLeft = positions.get("left")!;
    const posRight = positions.get("right")!;
    
    // Both should be at same X (same level)
    expect(posLeft.x).toBe(posRight.x);
    // Nodes are sorted alphabetically, so "left" is row 0, "right" is row 1
    // With 2 nodes in level, centering: rowIndex - (rowCount-1)/2
    // row 0: 0 - 0.5 = -0.5 * gap = negative
    // row 1: 1 - 0.5 = 0.5 * gap = positive
    // So one should be negative, one positive
    expect(posLeft.y).toBeLessThan(0);
    expect(posRight.y).toBeGreaterThan(0);
  });
});

describe("applyAutoLayout", () => {
  it("returns nodes with updated positions", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 999, y: 999 }, data: {} },
      { id: "b", position: { x: 999, y: 999 }, data: {} },
    ];
    const edges: Edge[] = [{ id: "e1", source: "a", target: "b" }];
    
    const layouted = applyAutoLayout(nodes, edges);
    
    // Positions should be updated
    expect(layouted[0].position.x).not.toBe(999);
    expect(layouted[1].position.x).not.toBe(999);
    
    // Original nodes should not be mutated
    expect(nodes[0].position.x).toBe(999);
  });
});

describe("getGraphBounds", () => {
  it("calculates bounds for positioned nodes", () => {
    const nodes: Node[] = [
      { id: "a", position: { x: 0, y: 0 }, data: {} },
      { id: "b", position: { x: 400, y: 200 }, data: {} },
    ];
    
    const bounds = getGraphBounds(nodes);
    
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
  });
  
  it("returns zeros for empty graph", () => {
    const bounds = getGraphBounds([]);
    
    expect(bounds.width).toBe(0);
    expect(bounds.height).toBe(0);
  });
});
