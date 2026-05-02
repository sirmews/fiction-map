# Story Graph Flow — Design Document

> A schema-driven React Flow canvas for narrative editors, built on GraphCore and story-runtime.

---

## Overview

`@your-org/story-graph-flow` provides a React Flow-based visualization layer for graph-based narratives. It bridges three layers:

```
┌─────────────────────────────────────────────────────────────────┐
│                    story-graph-flow                              │
│                   (React Flow UI)                                │
│                                                                  │
│  • Schema-driven node types                                      │
│  • Narrative-specific layout (left-to-right flow)                │
│  • Semantic edge validation                                      │
│  • Annotation overlays                                           │
│  • Selection and editing                                         │
├─────────────────────────────────────────────────────────────────┤
│                      story-runtime                               │
│                   (Execution Engine)                             │
│                                                                  │
│  • Condition evaluation                                          │
│  • Effect application                                            │
│  • State transitions                                             │
│  • Graph validation                                              │
├─────────────────────────────────────────────────────────────────┤
│                       graph-core                                 │
│                   (Schema Definitions)                           │
│                                                                  │
│  • Node/Edge/Annotation types                                    │
│  • Zod schemas                                                   │
│  • Registry                                                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Research Synthesis

See [`block-editor-research.md`](block-editor-research.md) for full analysis of BlockSuite, BlockNote, Logseq, and Block Protocol.

### Key Findings

**1. Schema ≠ Visual Design**
The schema defines data shape, not presentation. Tale Weaver's `SceneNode` makes 100+ visual decisions (colors, icons, layout, truncation) that can't be derived from the schema.

**2. Three-Tier Model (from FireCMS research)**
- Tier 1: Generated default — Functional but generic
- Tier 2: Preset override — Opinionated but customizable  
- Tier 3: Full custom — Complete control with primitives

**3. Subgraph-Aware Surfaces (from Block Protocol)**
UI surfaces often need more than one entity — they need a rooted subgraph with related entities and edges.

**4. Document → Editor Separation (from BlockSuite)**
The data model (story-runtime) is the single source of truth. Multiple visualizations can attach to it.

---

## The Honest Architecture

### What Can Be Schema-Driven ✅

| Layer | Generates From Schema |
|-------|----------------------|
| Form fields | Zod types → input components |
| Validation | Edge constraints → error checking |
| Layout positions | Graph structure → x,y coordinates |
| Edge connections | source/target types → valid targets |

### What Cannot Be Schema-Driven ❌

| Layer | Must Be Customized |
|-------|-------------------|
| Node appearance | Colors, icons, layout, truncation |
| Visual hierarchy | What to emphasize, what to hide |
| Interaction patterns | Click, drag, hover behaviors |
| Domain-specific badges | Chapter colors, status icons |

---

## The Three-Tier API

### Tier 1: Generated Default

```typescript
// Works out of the box, looks generic
<StoryGraphCanvas
  registry={registry}
  nodes={nodes}
  edges={edges}
/>
```

### Tier 2: Preset Override

```typescript
import { NarrativeNodePreset } from "@your-org/story-graph-flow/presets";

<StoryGraphCanvas
  registry={registry}
  nodes={nodes}
  edges={edges}
  nodeRenderers={{
    scene: NarrativeNodePreset.with({
      showChoiceCount: true,
      chapterColors: CHAPTER_COLORS,
    }),
  }}
/>
```

### Tier 3: Full Custom

```typescript
import { NodeCard, NodeBadge, NodeField } from "@your-org/story-graph-flow/primitives";

function MySceneNode({ id, data, selected }) {
  return (
    <NodeCard selected={selected}>
      <NodeBadge color={getChapterColor(data.chapter)}>
        {data.chapter}
      </NodeBadge>
      <NodeField weight="semibold">{data.title}</NodeField>
    </NodeCard>
  );
}
```

---

## Package Structure

```
@your-org/story-graph-flow/
├── core/                    # Canvas, layout, validation (GENERIC)
│   ├── StoryGraphCanvas.tsx
│   ├── useAutoLayout.ts
│   └── useEdgeValidation.ts
│
├── primitives/              # Building blocks for custom nodes
│   ├── NodeCard.tsx
│   ├── NodeBadge.tsx
│   ├── NodeField.tsx
│   └── EdgeLabel.tsx
│
├── presets/                 # Opinionated renderers (OPTIONAL)
│   ├── NarrativeNode.tsx
│   ├── FlowEdge.tsx
│   └── index.ts
│
└── index.ts
```

---

## Core Principles

1. **Schema-Driven UI** — Node appearance and behavior derived from GraphCore definitions
2. **Separation of Concerns** — Visualization (React Flow) separate from execution (story-runtime)
3. **Pluggable Renderers** — Default renderers can be overridden per node/edge type
4. **Narrative Layout** — Opinionated layout for story graphs (left-to-right flow, branching)
5. **React Flow Native** — Use React Flow's primitives, don't fight the library

---

## Package Structure

```
packages/story-graph-flow/
├── src/
│   ├── index.ts
│   │
│   ├── components/
│   │   ├── StoryGraphCanvas.tsx      # Main React Flow canvas
│   │   ├── SchemaNode.tsx            # Node renderer from schema
│   │   ├── SchemaEdge.tsx            # Edge renderer with validation
│   │   ├── AnnotationOverlay.tsx     # Status badges, comments
│   │   └── NodePalette.tsx           # Drag source for new nodes
│   │
│   ├── layout/
│   │   ├── index.ts
│   │   ├── level-layout.ts           # BFS level assignment
│   │   ├── auto-layout.ts            # Full auto-layout algorithm
│   │   └── layout-utils.ts           # Spacing, positioning
│   │
│   ├── hooks/
│   │   ├── useSchemaNodes.ts         # Derive React Flow nodes from registry
│   │   ├── useSchemaEdges.ts         # Derive React Flow edges from registry
│   │   ├── useEdgeValidation.ts      # Validate connections against schema
│   │   ├── useGraphLayout.ts         # Auto-layout hook
│   │   └── useGraphState.ts          # Sync with story-runtime state
│   │
│   ├── utils/
│   │   ├── derive-node-types.ts      # Create React Flow nodeTypes from registry
│   │   ├── derive-edge-types.ts      # Create React Flow edgeTypes from registry
│   │   └── schema-to-props.ts        # Map schema properties to node props
│   │
│   ├── context/
│   │   ├── GraphContext.tsx          # Shared state for canvas components
││   └── RuntimeContext.tsx          # story-runtime integration
│   │
│   └── types.ts
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Core Types

```typescript
import type { Node, Edge } from "@xyflow/react";
import type { GraphRegistry } from "@your-org/graph-core";
import type { 
  GraphRuntimeState, 
  Transition,
  TransitionResult 
} from "@your-org/story-runtime";

/**
 * Props for the main canvas component.
 */
export interface StoryGraphCanvasProps {
  /** GraphCore registry with node/edge type definitions */
  registry: GraphRegistry;
  
  /** Current graph data */
  nodes: Node[];
  edges: Edge[];
  
  /** Callbacks */
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  
  /** Selection */
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  
  /** Layout */
  autoLayout?: boolean;
  layoutDirection?: "LR" | "TB";  // Left-to-right or top-to-bottom
  
  /** Runtime integration (optional) */
  runtimeState?: GraphRuntimeState;
  onTransition?: (result: TransitionResult) => void;
  
  /** Annotations */
  annotations?: GraphAnnotation[];
  
  /** Customization */
  nodeRenderers?: Map<string, NodeRenderer>;
  edgeRenderers?: Map<string, EdgeRenderer>;
  
  /** React Flow passthrough */
  fitView?: boolean;
  nodesDraggable?: boolean;
  nodesConnectable?: boolean;
}

/**
 * Custom node renderer function.
 */
export type NodeRenderer = (
  props: SchemaNodeProps
) => JSX.Element;

export interface SchemaNodeProps {
  /** Node ID */
  id: string;
  
  /** GraphCore node type definition */
  nodeTypeDef: NodeTypeDefinition;
  
  /** Node properties (from schema) */
  data: Record<string, unknown>;
  
  /** Selection state */
  selected: boolean;
  
  /** Annotation overlay (if any) */
  annotation?: GraphAnnotation;
  
  /** Runtime state (if connected) */
  runtimeState?: GraphRuntimeState;
  
  /** Is this the current node in runtime? */
  isCurrentNode?: boolean;
  
  /** Has this node been visited? */
  isVisited?: boolean;
}

/**
 * Custom edge renderer function.
 */
export type EdgeRenderer = (
  props: SchemaEdgeProps
) => JSX.Element;

export interface SchemaEdgeProps {
  /** Edge ID */
  id: string;
  
  /** Source/target */
  source: string;
  target: string;
  
  /** GraphCore edge type definition */
  edgeTypeDef: EdgeTypeDefinition;
  
  /** Edge properties (from schema) */
  data?: Record<string, unknown>;
  
  /** Label */
  label?: string;
  
  /** Validation state */
  isValid?: boolean;
  validationError?: string;
  
  /** Transition preview (if runtime connected) */
  transitionAvailability?: TransitionAvailability;
}

/**
 * Annotation to overlay on a node.
 */
export interface GraphAnnotation {
  /** Node ID to annotate */
  nodeId: string;
  
  /** Annotation type */
  type: "status" | "comment" | "error" | "warning";
  
  /** Display label */
  label: string;
  
  /** Optional icon */
  icon?: string;
  
  /** Optional color */
  color?: string;
}

/**
 * Layout configuration.
 */
export interface LayoutConfig {
  /** Direction: left-to-right or top-to-bottom */
  direction: "LR" | "TB";
  
  /** Node dimensions */
  nodeWidth: number;
  nodeHeight: number;
  
  /** Spacing */
  horizontalGap: number;
  verticalGap: number;
  
  /** Padding around canvas */
  padding: number;
}
```

---

## Components

### 1. StoryGraphCanvas

The main canvas component. Wraps React Flow with schema-driven behavior.

```tsx
import { StoryGraphCanvas } from "@your-org/story-graph-flow";
import { myRegistry } from "./registry";

function StoryEditor() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  return (
    <StoryGraphCanvas
      registry={myRegistry}
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      selectedNodeId={selectedId}
      onSelectNode={setSelectedId}
      autoLayout
      layoutDirection="LR"
      fitView
    />
  );
}
```

### 2. SchemaNode

Renders a node based on its GraphCore type definition.

**Default behavior:**
- Renders a card with title from `displayName` or `name` property
- Shows property summary
- Highlights if selected
- Shows annotation overlay if provided
- Shows runtime state (current/visited) if connected

```tsx
// Default rendering
<SchemaNode
  id="scene-1"
  nodeTypeDef={registry.nodeTypes["scene"]}
  data={{ title: "The Beginning", body: "..." }}
  selected={true}
/>

// Custom renderer
const customRenderers = new Map([
  ["scene", MyCustomSceneNode],
]);

<StoryGraphCanvas
  registry={myRegistry}
  nodeRenderers={customRenderers}
  // ...
/>
```

### 3. SchemaEdge

Renders an edge with schema validation.

**Default behavior:**
- Validates connection against `sourceNodeTypes` and `targetNodeTypes`
- Shows error styling if invalid
- Displays label
- Shows transition availability if runtime connected

```tsx
<SchemaEdge
  id="edge-1"
  source="scene-1"
  target="scene-2"
  edgeTypeDef={registry.edgeTypes["choice"]}
  label="Go north"
  isValid={true}
/>
```

### 4. AnnotationOverlay

Overlays status badges, comments, or errors on nodes.

```tsx
const annotations: GraphAnnotation[] = [
  { nodeId: "scene-1", type: "status", label: "Draft", color: "yellow" },
  { nodeId: "scene-2", type: "error", label: "Missing target", color: "red" },
  { nodeId: "scene-3", type: "comment", label: "Needs revision" },
];

<StoryGraphCanvas
  registry={myRegistry}
  annotations={annotations}
  // ...
/>
```

---

## Layout Algorithm

### Level-Based Layout (from Tale Weaver)

The core layout algorithm from `story-flow-editor.tsx`:

1. **BFS Level Assignment** — Assign each node a "level" (column) based on distance from start
2. **Row Assignment** — Within each level, stack nodes vertically
3. **Centering** — Center each level's nodes around the midpoint

```typescript
// From Tale Weaver's story-flow-editor.tsx
function buildNodeLevels(scenes: Record<string, Scene>): Map<string, number> {
  const incoming = countIncomingScenes(scenes);
  const levels = new Map<string, number>();
  const queue: string[] = [];
  
  // Start with nodes that have no incoming edges
  for (const scene of Object.values(scenes)) {
    if ((incoming.get(scene.id) ?? 0) === 0) {
      queue.push(scene.id);
      levels.set(scene.id, 0);
    }
  }
  
  // BFS traversal
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentLevel = levels.get(currentId) ?? 0;
    
    for (const target of getOutgoingTargets(scenes[currentId])) {
      if (!levels.has(target)) {
        levels.set(target, currentLevel + 1);
        queue.push(target);
      }
    }
  }
  
  return levels;
}
```

### Position Calculation

```typescript
function calculateNodePositions(
  nodes: Node[],
  levels: Map<string, number>,
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
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
    const rowCount = levelNodes.length;
    
    levelNodes.forEach((node, rowIndex) => {
      const x = level * (config.nodeWidth + config.horizontalGap);
      const y = (rowIndex - (rowCount - 1) / 2) * (config.nodeHeight + config.verticalGap);
      
      positions.set(node.id, { x, y });
    });
  }
  
  return positions;
}
```

### Layout Hook

```typescript
function useGraphLayout(
  nodes: Node[],
  edges: Edge[],
  config: LayoutConfig
): Map<string, { x: number; y: number }> {
  return useMemo(() => {
    const levels = buildNodeLevels(nodes, edges);
    return calculateNodePositions(nodes, levels, config);
  }, [nodes, edges, config]);
}
```

---

## Hooks

### useSchemaNodes

Derive React Flow nodes from GraphCore registry and data.

```typescript
function useSchemaNodes(
  registry: GraphRegistry,
  nodeType: string,
  data: Record<string, unknown>[]
): Node[] {
  return useMemo(() => {
    const typeDef = registry.nodeTypes[nodeType];
    
    return data.map((item) => ({
      id: item.id as string,
      type: nodeType,
      position: { x: 0, y: 0 }, // Layout assigns later
      data: item,
    }));
  }, [registry, nodeType, data]);
}
```

### useSchemaEdges

Derive React Flow edges from GraphCore registry and transitions.

```typescript
function useSchemaEdges(
  registry: GraphRegistry,
  edgeType: string,
  transitions: Transition[]
): Edge[] {
  return useMemo(() => {
    const typeDef = registry.edgeTypes[edgeType];
    
    return transitions.map((t) => ({
      id: t.id,
      source: t.sourceNodeId,
      target: t.targetNodeId ?? "",
      type: edgeType,
      label: t.label,
      data: t,
    }));
  }, [registry, edgeType, transitions]);
}
```

### useEdgeValidation

Validate connections against GraphCore edge type constraints.

```typescript
function useEdgeValidation(
  registry: GraphRegistry
): {
  validateConnection: (connection: Connection) => boolean;
  getValidationError: (connection: Connection) => string | null;
} {
  const validateConnection = useCallback(
    (connection: Connection) => {
      const edgeType = connection.type ?? "default";
      const edgeTypeDef = registry.edgeTypes[edgeType];
      
      if (!edgeTypeDef) {
        return false;
      }
      
      const sourceNode = getNode(connection.source);
      const targetNode = getNode(connection.target);
      
      // Check sourceNodeTypes constraint
      if (edgeTypeDef.sourceNodeTypes) {
        if (!edgeTypeDef.sourceNodeTypes.includes(sourceNode.type)) {
          return false;
        }
      }
      
      // Check targetNodeTypes constraint
      if (edgeTypeDef.targetNodeTypes) {
        if (!edgeTypeDef.targetNodeTypes.includes(targetNode.type)) {
          return false;
        }
      }
      
      return true;
    },
    [registry]
  );
  
  return { validateConnection, getValidationError };
}
```

### useGraphState

Sync React Flow state with story-runtime state.

```typescript
function useGraphState(
  runtimeState: GraphRuntimeState
): {
  currentNodeId: string | null;
  visitedNodeIds: Set<string>;
  highlightNode: (nodeId: string) => boolean;
} {
  return {
    currentNodeId: runtimeState.currentNodeId,
    visitedNodeIds: runtimeState.visited,
    highlightNode: (nodeId) => {
      return runtimeState.currentNodeId === nodeId || runtimeState.visited.has(nodeId);
    },
  };
}
```

---

## Runtime Integration

The canvas can optionally connect to `story-runtime` for:

1. **Play Mode** — Visualize current state, highlight visited nodes
2. **Live Preview** — Show transition availability on edges
3. **Testing** — Step through graph, validate flows

```tsx
import { StoryGraphCanvas } from "@your-org/story-graph-flow";
import { 
  createInitialState, 
  applyTransition,
  builtinEvaluators,
  builtinHandlers 
} from "@your-org/story-runtime";

function PlayModeViewer({ story }) {
  const [runtimeState, setRuntimeState] = useState(
    () => createInitialState(story.startNodeId)
  );
  
  const handleTransition = (transition: Transition) => {
    const result = applyTransition(
      runtimeState,
      transition,
      builtinEvaluators,
      builtinHandlers
    );
    
    setRuntimeState(result.state);
  };
  
  return (
    <StoryGraphCanvas
      registry={storyRegistry}
      nodes={story.nodes}
      edges={story.edges}
      runtimeState={runtimeState}
      onTransition={handleTransition}
      autoLayout
      fitView
    />
  );
}
```

---

## Edge Validation

When a user attempts to connect two nodes:

1. Look up the edge type from the connection
2. Check `sourceNodeTypes` constraint
3. Check `targetNodeTypes` constraint
4. Check `unique` constraint (if edge should be unique)
5. Show visual feedback if invalid

```tsx
// In StoryGraphCanvas
const handleConnect = useCallback(
  (connection: Connection) => {
    const validation = validateConnection(connection);
    
    if (!validation.valid) {
      showToast(validation.error);
      return;
    }
    
    addEdge(connection);
  },
  [validateConnection]
);
```

---

## Annotation System

Annotations overlay metadata on nodes without modifying the underlying data.

**Use cases:**
- Editor: Show draft/review/published status
- Validation: Show errors/warnings
- Collaboration: Show comments, assignments
- Runtime: Show playtest state

```tsx
const annotations: GraphAnnotation[] = [
  // From editor
  { nodeId: "scene-1", type: "status", label: "Draft" },
  
  // From validation
  { nodeId: "scene-2", type: "error", label: "No outgoing choices" },
  
  // From collaboration
  { nodeId: "scene-3", type: "comment", label: "@author: Please revise" },
  
  // From runtime
  { nodeId: "scene-1", type: "status", label: "Current", icon: "▶" },
];
```

---

## Dependencies

```json
{
  "name": "@your-org/story-graph-flow",
  "version": "0.1.0",
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "@your-org/graph-core": "workspace:*",
    "@your-org/story-runtime": "workspace:*",
    "react": "^18.0.0",
    "zod": "^3.25.0"
  },
  "peerDependencies": {
    "@your-org/graph-core": "*",
    "@your-org/story-runtime": "*"
  }
}
```

---

## Comparison with Tale Weaver's Implementation

| Aspect | Tale Weaver | story-graph-flow |
|--------|-------------|------------------|
| Layout algorithm | Inline in `story-flow-editor.tsx` | Extracted to `layout/` module |
| Node types | Hardcoded `SceneNode` | Derived from GraphCore registry |
| Edge validation | None | Schema-driven validation |
| Runtime connection | Separate component | Integrated via props |
| Annotations | None | First-class overlay system |
| Reusability | Tale Weaver only | Any graph-based narrative |

---

## Example: Full Editor Setup

```tsx
import { useState } from "react";
import { StoryGraphCanvas, GraphAnnotation } from "@your-org/story-graph-flow";
import { 
  createInitialState,
  applyTransition,
  builtinEvaluators,
  builtinHandlers,
} from "@your-org/story-runtime";
import { storyRegistry } from "./registry";
import { useStoryNodes, useStoryEdges } from "./hooks";

function StoryEditor() {
  // Graph data
  const nodes = useStoryNodes();
  const edges = useStoryEdges();
  
  // Selection
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Validation annotations
  const [annotations, setAnnotations] = useState<GraphAnnotation[]>([]);
  
  // Runtime (optional, for play mode)
  const [runtimeState, setRuntimeState] = useState(
    () => createInitialState(nodes[0]?.id ?? "")
  );
  const [playMode, setPlayMode] = useState(false);
  
  // Handlers
  const handleConnect = (connection: Connection) => {
    // Validate against schema
    // Add edge if valid
  };
  
  const handleTransition = (transition: Transition) => {
    const result = applyTransition(
      runtimeState,
      transition,
      builtinEvaluators,
      builtinHandlers
    );
    setRuntimeState(result.state);
  };
  
  return (
    <div className="h-screen flex flex-col">
      <Toolbar>
        <Button onClick={() => setPlayMode(!playMode)}>
          {playMode ? "Edit Mode" : "Play Mode"}
        </Button>
      </Toolbar>
      
      <StoryGraphCanvas
        registry={storyRegistry}
        nodes={nodes}
        edges={edges}
        onConnect={handleConnect}
        selectedNodeId={selectedId}
        onSelectNode={setSelectedId}
        autoLayout
        layoutDirection="LR"
        annotations={annotations}
        runtimeState={playMode ? runtimeState : undefined}
        onTransition={playMode ? handleTransition : undefined}
        fitView
        nodesDraggable={!playMode}
        nodesConnectable={!playMode}
      />
    </div>
  );
}
```

---

## Implementation Status

### Completed ✅

| Module | File | Status | Tests |
|--------|------|--------|-------|
| Core Types | `src/types.ts` | ✅ Done | — |
| Layout Algorithm | `src/core/layout.ts` | ✅ Done | 12 tests ✅ |
| Hooks | `src/core/hooks.ts` | ✅ Done | — |
| StoryGraphCanvas | `src/core/StoryGraphCanvas.tsx` | ✅ Done | — |
| NodeCard Primitives | `src/primitives/NodeCard.tsx` | ✅ Done | — |
| NodeBadge Primitives | `src/primitives/NodeBadge.tsx` | ✅ Done | — |
| NodeField Primitives | `src/primitives/NodeField.tsx` | ✅ Done | — |
| EdgeLabel Primitives | `src/primitives/EdgeLabel.tsx` | ✅ Done | — |
| DefaultNode Preset | `src/presets/DefaultNode.tsx` | ✅ Done | — |
| Package Config | `package.json`, `tsconfig.json`, `vitest.config.ts` | ✅ Done | — |

**Total: 12 passing tests**

### Remaining

| Task | Priority | Notes |
|------|----------|-------|
| Runtime integration | Medium | Connect to story-runtime for play mode |
| Annotation overlay | Medium | Show status badges on nodes |
| More presets | Low | NarrativeNode, ChoiceNode, etc. |
| Theme system | Low | Custom colors, fonts |

---

## Implementation Phases (Original Plan)

### Phase 1: Core Canvas ✅
- [x] `StoryGraphCanvas` component wrapping React Flow
- [x] `SchemaNode` basic rendering from registry
- [x] Pass-through props to React Flow

### Phase 2: Layout ✅
- [x] Extract `level-layout.ts` from Tale Weaver
- [x] `useAutoLayout` hook
- [x] Auto-layout on mount and changes
- [x] Layout direction (LR vs TB)

### Phase 3: Validation ✅
- [x] `useEdgeValidation` hook
- [x] Prevent invalid connections

### Phase 4: Annotations (Partial)
- [ ] `AnnotationOverlay` component
- [x] Badge positioning (via NodeBadge primitive)
- [x] Status/comment/error types

### Phase 5: Runtime Integration
- [ ] `useGraphState` hook
- [ ] Highlight current/visited nodes
- [ ] Show transition availability on edges
- [ ] Click-to-transition in play mode

### Phase 6: Customization
- [x] Custom node renderers (via nodeRenderers prop)
- [ ] Custom edge renderers
- [ ] Theme/styling options

---

## Key Files to Extract from Tale Weaver

| Tale Weaver File | story-graph-flow Target |
|-----------------|-------------------------|
| `story-flow-editor.tsx` (layout algorithm) | `layout/level-layout.ts` |
| `story-flow-editor.tsx` (position calculation) | `layout/auto-layout.ts` |
| `scene-node.tsx` | Reference for `SchemaNode` |
| Graph validation (domain) | Use story-runtime's validation |

---

## Open Questions

1. **Multi-select editing?** — Should we support editing multiple nodes at once?
2. **Undo/redo?** — Should canvas support undo stack for layout/edits?
3. **Mini-map?** — Include React Flow's MiniMap by default?
4. **Snap-to-grid?** — Optional grid snapping for manual layout?
5. **Collaboration?** — Real-time cursor support?

---

## Success Metrics

- [ ] Can render a story graph from GraphCore registry
- [ ] Auto-layout produces readable left-to-right flow
- [ ] Invalid connections are prevented/flagged
- [ ] Annotations display correctly on nodes
- [ ] Play mode highlights current/visited nodes
- [ ] Custom renderers work for at least 2 node types
