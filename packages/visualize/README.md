# @fiction-map/visualize

React Flow components for graph visualization.

## Installation

```bash
npm install @fiction-map/visualize
```

## Features

- **StoryGraphCanvas** — Main canvas component
- **Auto-layout** — Automatic node positioning
- **Edge validation** — Connection validation
- **Node primitives** — Building blocks for custom nodes
- **Default presets** — Ready-to-use components

## Quick Start

```tsx
import { StoryGraphCanvasWithProvider } from "@fiction-map/visualize"
import type { Node, Edge } from "@xyflow/react"

const nodes: Node[] = [
  { id: "start", position: { x: 0, y: 0 }, data: { title: "Start" } },
  { id: "end", position: { x: 200, y: 0 }, data: { title: "End" } },
]

const edges: Edge[] = [
  { id: "e1", source: "start", target: "end", label: "Continue" }
]

function App() {
  return (
    <div style={{ height: "100vh" }}>
      <StoryGraphCanvasWithProvider
        nodes={nodes}
        edges={edges}
        autoLayout
        fitView
      />
    </div>
  )
}
```

## Components

### StoryGraphCanvas

Main canvas component. Use `StoryGraphCanvasWithProvider` if you need React Flow hooks.

```tsx
<StoryGraphCanvas
  nodes={nodes}
  edges={edges}
  autoLayout={true}
  layoutConfig={{ direction: "LR" }}
  fitView={true}
  selectedNodeId={selectedId}
  onSelectNode={handleSelect}
  annotations={annotations}
  validateConnection={validateConnection}
/>
```

### Node Primitives

Build custom node components:

```tsx
import { 
  NodeCard, 
  NodeCardHeader, 
  NodeCardBody,
  TargetHandle,
  SourceHandle 
} from "@fiction-map/visualize/primitives"

function CustomNode({ id, data, selected }) {
  return (
    <NodeCard selected={selected}>
      <TargetHandle />
      <NodeCardHeader>
        <h3>{data.title}</h3>
      </NodeCardHeader>
      <NodeCardBody>
        <p>{data.description}</p>
      </NodeCardBody>
      <SourceHandle />
    </NodeCard>
  )
}
```

### DefaultNode

Pre-built node component:

```tsx
import { DefaultNode, createDefaultNodeWithColors } from "@fiction-map/visualize/presets"

// Use as-is
const nodeTypes = { default: DefaultNode }

// Or with custom colors
const CustomNode = createDefaultNodeWithColors({
  scene: "#3b82f6",
  action: "#10b981",
  ending: "#f59e0b"
})
```

## Auto Layout

Enable automatic layout with `autoLayout` prop:

```tsx
<StoryGraphCanvas
  nodes={nodes}
  edges={edges}
  autoLayout
  layoutConfig={{
    direction: "LR",  // or "TB"
    nodeWidth: 260,
    nodeHeight: 120,
    horizontalGap: 140,
    verticalGap: 80,
  }}
/>
```

## Annotations

Add badges to nodes:

```tsx
const annotations = [
  { nodeId: "start", type: "status", label: "Active" },
  { nodeId: "error-node", type: "error", label: "Error" },
]

<StoryGraphCanvas
  nodes={nodes}
  edges={edges}
  annotations={annotations}
/>
```

## Edge Validation

Validate connections before they're created:

```tsx
function validateConnection(connection) {
  const sourceNode = nodes.find(n => n.id === connection.source)
  const targetNode = nodes.find(n => n.id === connection.target)
  
  // Your validation logic
  if (sourceNode.data.type === "ending") {
    return { valid: false, error: "Endings cannot have outgoing edges" }
  }
  
  return { valid: true }
}

<StoryGraphCanvas
  nodes={nodes}
  edges={edges}
  validateConnection={validateConnection}
/>
```

## License

MIT
