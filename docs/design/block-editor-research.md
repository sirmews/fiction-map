# Block Editor Research — Synthesis for Story Graph Flow

## What We Researched

| System | What It Provides | Relevance |
|--------|------------------|-----------|
| **BlockSuite** | CRDT-based, document-centric, editor/data separation | Headless data model + pluggable editors |
| **BlockNote** | ProseMirror/TipTap-based, schema-driven blocks | Custom block specs, React components |
| **Logseq** | Block/graph model with DataScript | Relational blocks, Datalog queries |
| **Block Protocol** | Typed UI blocks with subgraph awareness | Entity types, property types, subgraph surfaces |
| **Tale Weaver's research** | External influences document | What to take/not take |

---

## Key Architectural Patterns

### 1. BlockSuite: Document → Editor Separation

```typescript
// The doc is the single source of truth
const doc = createEmptyDoc().init();

// Multiple editors can attach to the same doc
const pageEditor = new PageEditor();
const edgelessEditor = new EdgelessEditor();

pageEditor.doc = doc;
edgelessEditor.doc = doc;
```

**Lesson:** Separate the data model from the visualization layer. The same data can power multiple views (canvas, list, timeline).

**Applied to story-graph-flow:**
```typescript
// story-runtime is the "doc" (data model)
const runtimeState = createInitialState("scene-1");

// Multiple visualizations can attach
<StoryGraphCanvas runtimeState={runtimeState} />
<StoryTimelineView runtimeState={runtimeState} />
<StoryTreeView runtimeState={runtimeState} />
```

---

### 2. BlockNote: Schema → Block Spec → React Component

```typescript
// Define block schema
const CustomBlockConfig = {
  type: "custom",
  content: "inline",
  propSchema: {
    title: { default: "" },
    color: { default: "blue" },
  },
};

// Define React renderer
const CustomBlockImpl = {
  render: ({ block, editor }) => (
    <div style={{ color: block.props.color }}>
      {block.props.title}
    </div>
  ),
};

// Combine into spec
const CustomBlockSpec = createReactBlockSpec(CustomBlockConfig, CustomBlockImpl);
```

**Lesson:** Block types have three parts:
1. **Schema** — What properties exist
2. **Implementation** — How to render
3. **Registration** — How the editor knows about it

**Applied to story-graph-flow:**
```typescript
// Schema comes from GraphCore
const sceneNodeType = defineNodeType({
  id: "scene",
  propertiesSchema: z.object({
    title: z.string(),
    body: z.string(),
  }),
});

// Implementation is separate (application-specific)
const SceneNodeRenderer = ({ data }) => (
  <NodeCard>
    <h3>{data.title}</h3>
    <p>{data.body}</p>
  </NodeCard>
);

// Registration connects them
const nodeRenderers = {
  scene: SceneNodeRenderer,
};
```

---

### 3. Logseq: Blocks as Relational Entities

```
Block
├── uuid: unique ID
├── parent: reference to parent block
├── page: reference to owning page
├── refs: references to other blocks (cross-links)
├── tags: semantic classes
└── order: fractional index for ordering
```

**Lesson:** Blocks are not just nested trees — they have identity, relationships, and can be queried.

**Applied to story-graph-flow:**
- Nodes have identity (UUID)
- Edges define relationships
- Annotations are cross-cutting concerns
- Queryable via story-runtime

---

### 4. Block Protocol: Subgraph-Aware Surfaces

```typescript
// A block receives a subgraph, not just a single entity
interface BlockEntitySubgraph {
  root: Entity;
  relatedEntities: Entity[];
  links: Link[];
}

// The block can query within its subgraph
const blockHandler = new GraphBlockHandler({
  blockEntitySubgraph: (subgraph) => {
    // Access related data
    const author = subgraph.links.find(l => l.type === "author");
  }
});
```

**Lesson:** A UI surface often needs more than one entity — it needs a rooted subgraph.

**Applied to story-graph-flow:**
```typescript
// When rendering a scene node, we might need:
// - The scene itself
// - Connected choices
// - Referenced entities
// - Annotations

interface SceneNodeData {
  scene: Scene;
  choices: Choice[];
  entities: WorldEntity[];
  annotations: Annotation[];
}
```

---

### 5. Tale Weaver's External Influences: What to Take

| Take | Don't Take |
|------|------------|
| Typed UI surfaces | Public URL identity |
| Subgraph-aware rendering | Marketplace-first scope |
| Default generation with override paths | Full protocol complexity |
| Variants (same surface, different defaults) | File/database dual truth |
| Example graph fixtures | External hub distribution |

---

## Synthesis: The Honest Architecture

### What Can Be Schema-Driven

| Layer | Can Generate | Must Customize |
|-------|--------------|----------------|
| **Form fields** | ✅ From Zod schema | Field order, grouping |
| **Validation** | ✅ From edge constraints | Error messages |
| **Layout positions** | ✅ From graph structure | Spacing config |
| **Edge connections** | ✅ From source/target types | Edge styling |
| **Node appearance** | ❌ Too many decisions | Everything visual |

### The Three-Tier Model (from FireCMS research)

```
┌─────────────────────────────────────────────────────────────────┐
│                     TIER 3: FULL CUSTOM                         │
│                                                                 │
│  "I need complete control"                                      │
│  → Write your own React component, use primitives as helpers    │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     TIER 2: PRESET OVERRIDE                     │
│                                                                 │
│  "The default is close, but I need tweaks"                      │
│  → Extend a preset, override specific parts                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     TIER 1: GENERATED DEFAULT                   │
│                                                                 │
│  "I just want it to work"                                       │
│  → Auto-generated from schema, functional but generic           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Proposed API

### Tier 1: Generated Default

```typescript
// Works out of the box, looks generic
<StoryGraphCanvas
  registry={registry}
  nodes={nodes}
  edges={edges}
/>
```

Generates:
- Basic card nodes with title + properties
- Simple edges with labels
- Auto-layout

### Tier 2: Preset Override

```typescript
// Use built-in presets, customize behavior
import { 
  NarrativeNodePreset, 
  FlowEdgePreset 
} from "@your-org/story-graph-flow/presets";

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
  edgeRenderers={{
    choice: FlowEdgePreset.with({
      animated: true,
    }),
  }}
/>
```

### Tier 3: Full Custom

```typescript
// Complete control using primitives
import { 
  NodeCard, 
  NodeBadge, 
  NodeField,
  Handle,
  Position 
} from "@your-org/story-graph-flow/primitives";

function MySceneNode({ id, data, selected }) {
  return (
    <NodeCard selected={selected} className="w-60">
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center gap-2">
        <NodeBadge color={getChapterColor(data.chapter)}>
          {data.chapter}
        </NodeBadge>
        <NodeBadge variant="muted">
          {data.choices.length} choices
        </NodeBadge>
      </div>
      
      <NodeField label="Title" weight="semibold">
        {data.title}
      </NodeField>
      
      <NodeField truncate lines={2}>
        {data.prose?.[0]}
      </NodeField>
      
      <Handle type="source" position={Position.Bottom} />
    </NodeCard>
  );
}

<StoryGraphCanvas
  registry={registry}
  nodes={nodes}
  edges={edges}
  nodeRenderers={{ scene: MySceneNode }}
/>
```

---

## Package Structure

```
@your-org/story-graph-flow/
├── core/                    # Canvas, layout, validation
│   ├── StoryGraphCanvas.tsx
│   ├── useAutoLayout.ts
│   └── useEdgeValidation.ts
│
├── primitives/              # Building blocks for custom nodes
│   ├── NodeCard.tsx
│   ├── NodeBadge.tsx
│   ├── NodeField.tsx
│   ├── EdgeLabel.tsx
│   └── Handle.tsx           # Re-exports from @xyflow/react
│
├── presets/                 # Opinionated renderers
│   ├── NarrativeNode.tsx    # Story-scene styled node
│   ├── FlowEdge.tsx         # Animated edge with label
│   └── index.ts
│
└── index.ts
```

---

## What's Generic vs What's Domain-Specific

| Generic (in library) | Domain-Specific (in application) |
|---------------------|----------------------------------|
| Canvas wrapper | Node visual design |
| Auto-layout algorithm | Color schemes, icons |
| Edge validation | Error messages, tooltips |
| Selection state | Property panels |
| Zoom/pan/fit | Toolbars, sidebars |
| React Flow primitives | Business logic |
| Default node card | Chapter colors, badges |

---

## The Key Insight

**Don't try to generate the visual design from the schema.**

The schema tells you:
- What properties exist
- What types they are
- What constraints apply

It does NOT tell you:
- How to arrange visual elements
- What colors to use
- What icons mean what
- How to truncate text

Instead:
1. **Provide good primitives** — NodeCard, NodeBadge, etc.
2. **Provide working presets** — Opinionated but overrideable
3. **Let applications customize** — Full control when needed
4. **Focus on the hard problems** — Layout, validation, state sync

---

## Updated Implementation Priority

| Priority | What | Why |
|----------|------|-----|
| **P0** | Canvas + layout + validation | These ARE generic |
| **P0** | Primitives (NodeCard, etc.) | Enable custom builds |
| **P1** | One preset (NarrativeNode) | Prove the pattern works |
| **P2** | More presets | Expand use cases |
| **P3** | Theme system | For deeper customization |

The library's value is:
1. **Hard problems solved** — Layout, validation, state sync
2. **Primitives provided** — Don't start from scratch
3. **Presets available** — Good starting point

NOT:
1. Generating beautiful UI from schema alone
2. One-size-fits-all visual design
3. Replacing application-level design decisions
