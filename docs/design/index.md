# Design Documents

Internal design documents for Fiction Map packages.

## Vision Documents

| Document | Description |
|----------|-------------|
| [fiction-map-vision.md](fiction-map-vision.md) | The complete vision: Encore for Graphs |
| [conceptual-guide.md](conceptual-guide.md) | Deep dive into concepts, layers, and architecture |
| [simple-explanation.md](simple-explanation.md) | Plain-English explanation with analogies |
| [side-by-side-examples.md](side-by-side-examples.md) | Encore vs Fiction Map comparison |
| [quick-reference.md](quick-reference.md) | Cheat sheet for APIs and concepts |

## Package Designs

| Document | Package | Description |
|----------|---------|-------------|
| [story-runtime-design.md](story-runtime-design.md) | `@your-org/story-runtime` | Schema-driven runtime engine for graph-based narratives |
| [story-graph-flow-design.md](story-graph-flow-design.md) | `@your-org/story-graph-flow` | React Flow visualization layer for narrative editors |

## Research Documents

| Document | Description |
|----------|-------------|
| [block-editor-research.md](block-editor-research.md) | Research on BlockSuite, BlockNote, Logseq, Block Protocol |

## Architecture

```
┌─────────────────────────────────────┐
│        fiction-map dev              │  CLI + Dashboard
│      (Development Tools)            │
├─────────────────────────────────────┤
│         @fiction-map/core           │  defineNodeType, defineEdgeType
│       (Type Definitions)            │
├─────────────────────────────────────┤
│       @fiction-map/runtime          │  Graph execution engine
│       (Execution Engine)            │
├─────────────────────────────────────┤
│       @fiction-map/visualize        │  React Flow components
│       (Visualization)               │
└─────────────────────────────────────┘
```

## Key Innovation

**Graph is the primary artifact.**

Like Encore extracts backend architecture from code, Fiction Map extracts graph structure from code.

- Define node types, edge types, conditions, effects in code
- Generator discovers them via file conventions
- Dashboard visualizes the graph
- Runtime executes traversals
- Traces show what happened
