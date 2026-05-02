import { useMemo, useCallback } from "react";
import type { Node, Edge, Connection } from "@xyflow/react";
import { applyAutoLayout, buildNodeLevels, getGraphBounds } from "./layout";
import type { LayoutConfig, ConnectionValidation } from "../types";
import { DEFAULT_LAYOUT_CONFIG } from "../types";

/**
 * Hook for auto-layouting nodes.
 * 
 * @param nodes - Current nodes
 * @param edges - Current edges
 * @param config - Layout configuration
 * @param enabled - Whether auto-layout is enabled
 * @returns Layouted nodes and utility functions
 */
export function useAutoLayout(
  nodes: Node[],
  edges: Edge[],
  config: Partial<LayoutConfig> = {},
  enabled: boolean = true
): {
  /** Nodes with positions applied */
  layoutedNodes: Node[];
  /** Level for each node (column index) */
  nodeLevels: Map<string, number>;
  /** Bounding box of the graph */
  bounds: { width: number; height: number; minX: number; minY: number; maxX: number; maxY: number };
  /** Re-layout with new config */
  relayout: () => Node[];
} {
  const fullConfig = { ...DEFAULT_LAYOUT_CONFIG, ...config };
  
  const layoutedNodes = useMemo(() => {
    if (!enabled) return nodes;
    return applyAutoLayout(nodes, edges, fullConfig);
  }, [nodes, edges, fullConfig, enabled]);
  
  const nodeLevels = useMemo(() => {
    return buildNodeLevels(nodes, edges);
  }, [nodes, edges]);
  
  const bounds = useMemo(() => {
    return getGraphBounds(layoutedNodes, fullConfig);
  }, [layoutedNodes, fullConfig]);
  
  const relayout = useCallback(() => {
    return applyAutoLayout(nodes, edges, fullConfig);
  }, [nodes, edges, fullConfig]);
  
  return {
    layoutedNodes,
    nodeLevels,
    bounds,
    relayout,
  };
}

/**
 * Hook for validating edge connections.
 * 
 * @param nodes - Current nodes (for type lookup)
 * @param validateFn - Custom validation function
 * @returns Validation utilities
 */
export function useEdgeValidation(
  nodes: Node[],
  validateFn?: (connection: Connection, nodes: Node[]) => ConnectionValidation
): {
  /** Validate a potential connection */
  validate: (connection: Connection) => ConnectionValidation;
  /** Check if connection is valid */
  isValid: (connection: Connection) => boolean;
  /** Get error message for invalid connection */
  getError: (connection: Connection) => string | undefined;
} {
  const validate = useCallback(
    (connection: Connection): ConnectionValidation => {
      // No validation function provided - accept all
      if (!validateFn) {
        return { valid: true };
      }
      
      return validateFn(connection, nodes);
    },
    [nodes, validateFn]
  );
  
  const isValid = useCallback(
    (connection: Connection): boolean => {
      return validate(connection).valid;
    },
    [validate]
  );
  
  const getError = useCallback(
    (connection: Connection): string | undefined => {
      const result = validate(connection);
      return result.valid ? undefined : result.error;
    },
    [validate]
  );
  
  return {
    validate,
    isValid,
    getError,
  };
}

/**
 * Create a validation function that checks source/target node types.
 * 
 * @param allowedConnections - Map of source type → allowed target types
 * @returns Validation function
 */
export function createTypeValidation(
  allowedConnections: Map<string, string[]>
): (connection: Connection, nodes: Node[]) => ConnectionValidation {
  return (connection: Connection, nodes: Node[]): ConnectionValidation => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    
    if (!sourceNode) {
      return { valid: false, error: `Source node "${connection.source}" not found` };
    }
    
    if (!targetNode) {
      return { valid: false, error: `Target node "${connection.target}" not found` };
    }
    
    const sourceType = sourceNode.type ?? "default";
    const targetType = targetNode.type ?? "default";
    
    const allowedTargets = allowedConnections.get(sourceType);
    
    if (!allowedTargets) {
      return { valid: true }; // No restrictions for this source type
    }
    
    if (!allowedTargets.includes(targetType)) {
      return {
        valid: false,
        error: `Cannot connect ${sourceType} to ${targetType}. Allowed targets: ${allowedTargets.join(", ")}`,
      };
    }
    
    return { valid: true };
  };
}

/**
 * Create a validation function that prevents duplicate edges.
 * 
 * @param edges - Current edges
 * @returns Validation function
 */
export function createUniqueEdgeValidation(
  edges: Edge[]
): (connection: Connection) => ConnectionValidation {
  const edgeKeys = new Set(
    edges.map((e) => `${e.source}-${e.target}`)
  );
  
  return (connection: Connection): ConnectionValidation => {
    const key = `${connection.source}-${connection.target}`;
    
    if (edgeKeys.has(key)) {
      return { valid: false, error: "Edge already exists" };
    }
    
    return { valid: true };
  };
}
