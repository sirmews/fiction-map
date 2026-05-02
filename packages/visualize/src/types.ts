import type {
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from "@xyflow/react";

/**
 * Layout configuration for auto-layout.
 */
export interface LayoutConfig {
  /** Direction: left-to-right or top-to-bottom */
  direction: "LR" | "TB";
  /** Node dimensions */
  nodeWidth: number;
  nodeHeight: number;
  /** Spacing between nodes */
  horizontalGap: number;
  verticalGap: number;
  /** Padding around canvas */
  padding: number;
}

/**
 * Default layout configuration.
 */
export const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
  direction: "LR",
  nodeWidth: 260,
  nodeHeight: 120,
  horizontalGap: 140,
  verticalGap: 80,
  padding: 40,
};

/**
 * Annotation to overlay on a node.
 */
export interface GraphAnnotation {
  /** Node ID to annotate */
  nodeId: string;
  /** Annotation type */
  type: "status" | "comment" | "error" | "warning" | "info";
  /** Display label */
  label: string;
  /** Optional icon name */
  icon?: string;
  /** Optional color override */
  color?: string;
}

/**
 * Validation result for a connection.
 */
export interface ConnectionValidation {
  /** Is the connection valid? */
  valid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Props for the main canvas component.
 */
export interface StoryGraphCanvasProps {
  /** React Flow nodes */
  nodes: Node[];
  /** React Flow edges */
  edges: Edge[];
  
  /** Change handlers */
  onNodesChange?: OnNodesChange;
  onEdgesChange?: OnEdgesChange;
  onConnect?: OnConnect;
  
  /** Selection */
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  
  /** Layout */
  autoLayout?: boolean;
  layoutConfig?: Partial<LayoutConfig>;
  
  /** Annotations */
  annotations?: GraphAnnotation[];
  
  /** Validation */
  validateConnection?: (connection: Connection) => ConnectionValidation;
  
  /** React Flow passthrough */
  fitView?: boolean;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
  nodesFocusable?: boolean;
  edgesFocusable?: boolean;
  elementsSelectable?: boolean;
  minZoom?: number;
  maxZoom?: number;
  
  /** Styling */
  className?: string;
  style?: React.CSSProperties;
  
  /** Children for custom overlays */
  children?: React.ReactNode;
}

/**
 * Props for node primitives.
 */
export interface NodePrimitiveProps {
  /** Is the node selected? */
  selected?: boolean;
  /** Custom className */
  className?: string;
  /** Custom styles */
  style?: React.CSSProperties;
  /** Children */
  children?: React.ReactNode;
}

/**
 * Props for NodeBadge primitive.
 */
export interface NodeBadgeProps {
  /** Badge content */
  children: React.ReactNode;
  /** Color variant */
  color?: string;
  /** Style variant */
  variant?: "default" | "muted" | "success" | "warning" | "error";
  /** Custom className */
  className?: string;
}

/**
 * Props for NodeField primitive.
 */
export interface NodeFieldProps {
  /** Field label */
  label?: string;
  /** Field content */
  children: React.ReactNode;
  /** Font weight */
  weight?: "normal" | "medium" | "semibold" | "bold";
  /** Truncate text */
  truncate?: boolean;
  /** Number of lines to show */
  lines?: number;
  /** Custom className */
  className?: string;
}

/**
 * Props for EdgeLabel primitive.
 */
export interface EdgeLabelProps {
  /** Label text */
  children: React.ReactNode;
  /** Is this edge valid? */
  valid?: boolean;
  /** Show as animated */
  animated?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * Node renderer function type.
 */
export type NodeRenderer = (props: {
  id: string;
  data: Record<string, unknown>;
  selected: boolean;
  annotation?: GraphAnnotation;
}) => JSX.Element;

/**
 * Edge renderer function type.
 */
export type EdgeRenderer = (props: {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, unknown>;
  selected: boolean;
}) => JSX.Element;
