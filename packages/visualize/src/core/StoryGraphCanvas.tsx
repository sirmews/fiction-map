import React, { useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
  type EdgeTypes,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { StoryGraphCanvasProps, ConnectionValidation, GraphAnnotation } from "../types";
import { useAutoLayout, useEdgeValidation } from "./hooks";
import { DefaultNode } from "../presets/DefaultNode";

const DEFAULT_NODE_TYPES: NodeTypes = {
  default: DefaultNode,
};

/**
 * StoryGraphCanvas - Main canvas component for graph visualization.
 * 
 * Provides:
 * - React Flow setup with sensible defaults
 * - Auto-layout (optional)
 * - Edge validation (optional)
 * - Selection state management
 * - Annotation overlay support
 * 
 * @example
 * ```tsx
 * <StoryGraphCanvas
 *   nodes={nodes}
 *   edges={edges}
 *   autoLayout
 *   fitView
 * />
 * ```
 */
export function StoryGraphCanvas({
  nodes: externalNodes,
  edges: externalEdges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  selectedNodeId,
  onSelectNode,
  autoLayout = false,
  layoutConfig,
  annotations,
  validateConnection,
  fitView = true,
  nodesDraggable = true,
  nodesConnectable = true,
  nodesFocusable = true,
  edgesFocusable = true,
  elementsSelectable = true,
  minZoom = 0.1,
  maxZoom = 2,
  className = "",
  style,
  children,
}: StoryGraphCanvasProps): JSX.Element {
  // Handle auto-layout
  const { layoutedNodes } = useAutoLayout(
    externalNodes,
    externalEdges,
    layoutConfig,
    autoLayout
  );
  
  const nodes = autoLayout ? layoutedNodes : externalNodes;
  
  // Build annotation index
  const annotationMap = useMemo(() => {
    const map = new Map<string, GraphAnnotation>()
    for (const annotation of annotations ?? []) {
      map.set(annotation.nodeId, annotation)
    }
    return map
  }, [annotations])
  
  // Handle node click for selection
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onSelectNode?.(node.id);
    },
    [onSelectNode]
  );
  
  // Handle pane click to deselect
  const handlePaneClick = useCallback(() => {
    onSelectNode?.(null);
  }, [onSelectNode]);
  
  // Handle connection with validation
  const { validate } = useEdgeValidation(nodes, validateConnection);
  
  const handleConnect = useCallback(
    (connection: Connection) => {
      if (validateConnection) {
        const result = validate(connection);
        if (!result.valid) {
          console.warn("Invalid connection:", result.error);
          return;
        }
      }
      onConnect?.(connection);
    },
    [validateConnection, validate, onConnect]
  );
  
  // Mark selected node
  const nodesWithSelection = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      selected: node.id === selectedNodeId,
      data: {
        ...node.data,
        annotation: annotationMap.get(node.id),
      },
    }));
  }, [nodes, selectedNodeId, annotationMap]);
  
  return (
    <div
      className={["h-full w-full", className].filter(Boolean).join(" ")}
      style={style}
    >
      <ReactFlow
        nodes={nodesWithSelection}
        edges={externalEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={DEFAULT_NODE_TYPES}
        fitView={fitView}
        nodesDraggable={nodesDraggable}
        nodesConnectable={nodesConnectable}
        nodesFocusable={nodesFocusable}
        edgesFocusable={edgesFocusable}
        elementsSelectable={elementsSelectable}
        minZoom={minZoom}
        maxZoom={maxZoom}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls showInteractive={false} />
        {children}
      </ReactFlow>
    </div>
  );
}

/**
 * StoryGraphCanvasWithProvider - Canvas with ReactFlowProvider.
 * 
 * Use this when you need to use React Flow hooks in child components.
 */
export function StoryGraphCanvasWithProvider(
  props: StoryGraphCanvasProps
): JSX.Element {
  return (
    <ReactFlowProvider>
      <StoryGraphCanvas {...props} />
    </ReactFlowProvider>
  );
}
