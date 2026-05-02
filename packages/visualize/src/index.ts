// Core
export { StoryGraphCanvas, StoryGraphCanvasWithProvider } from "./core/StoryGraphCanvas";
export { useAutoLayout, useEdgeValidation, createTypeValidation, createUniqueEdgeValidation } from "./core/hooks";
export { 
  applyAutoLayout, 
  buildNodeLevels, 
  calculateNodePositions,
  getGraphBounds 
} from "./core/layout";

// Types
export type {
  StoryGraphCanvasProps,
  LayoutConfig,
  GraphAnnotation,
  ConnectionValidation,
  NodePrimitiveProps,
  NodeBadgeProps,
  NodeFieldProps,
  EdgeLabelProps,
  NodeRenderer,
  EdgeRenderer,
} from "./types";
export { DEFAULT_LAYOUT_CONFIG } from "./types";

// Primitives - NodeCard
export {
  NodeCard,
  NodeCardHeader,
  NodeCardBody,
  NodeCardFooter,
  NodeHandle,
  TargetHandle,
  SourceHandle,
} from "./primitives/NodeCard";

// Primitives - NodeBadge
export { NodeBadge, NodeBadgeGroup } from "./primitives/NodeBadge";

// Primitives - NodeField
export {
  NodeField,
  NodeTitle,
  NodeDescription,
  NodeMeta,
  NodeId,
} from "./primitives/NodeField";

// Primitives - EdgeLabel
export { EdgeLabel, EdgeLabelText } from "./primitives/EdgeLabel";

// Presets
export { DefaultNode, createDefaultNodeWithColors } from "./presets/DefaultNode";
