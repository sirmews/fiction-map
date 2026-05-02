# Tale Weaver — Core Graph Model

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## The Unified Graph Model

Everything in Tale Weaver is built from three first-class primitives:

| Primitive | What It Is | File |
|-----------|-----------|------|
| **Node** | First-class entity with identity | `graph-core/src/define-node-type.ts` |
| **Edge** | Typed relationship between two nodes | `graph-core/src/define-edge-type.ts` |
| **Annotation** | Authored overlay on a node or body range | `graph-core/src/define-annotation-type.ts` |

This is a deliberate departure from traditional CMS models. Instead of bespoke tables for every concept (`scenes`, `characters`, `items`, `posts`), the project uses a unified identity graph where node types and facets distinguish different kinds of content.

**Database backing:** Three tables — `graph_nodes`, `graph_edges`, `graph_annotations` (`graph-core/src/registry.ts:49`)

---

## Facets — The ECS-Style Composition

Not every node has the same shape. The useful pattern is **one identity model with different optional facets** (`define-node-type.ts:11-14`):

```typescript
interface NodeTypeFacets {
  body: boolean;      // Has rich authored content (TipTap/ProseMirror)
  children: boolean;  // Can contain child nodes
}
```

- `scene` — has `body: true, children: false`
- `story-world-entity` — has `body: false, children: false`
- `journal-entry` (in Journal product) — has `body: true, children: false`

---

## Three-Layer Architecture

The project enforces strict layer separation:

```
Layer 1: graph-core (generic toolkit)
  └─ defineNodeType(), defineEdgeType(), defineAnnotationType()
  └─ Registry generation from distributed definitions
  └─ Block type definitions (paragraph, heading, list-item, code-block)
  └─ TipTap ↔ graph sync layer

Layer 2: frontend-graph (reusable primitives)     → packages/frontend-graph/
  ├─ GraphForm, GraphCollection, GraphDetail, GraphEditor
  ├─ GraphRelationPicker (creates edges with validation)
  ├─ useNodes, useEdges, useCreateEdge hooks
  └─ nodesApi, edgesApi typed clients

Layer 3: product-tale-weaver-ui (product composition) → packages/product-tale-weaver-ui/
  ├─ SceneReferencesPanel (composes GraphRelationPicker)
  ├─ useStoryWorldEntities (product-scoped hook)
  ├─ Story editor, flow view, preview, world editor
  └─ Page/screen components
```

**Key rule:** Product semantics belong in product code, not in primitives. Primitives must be reusable WITHOUT dropping core contracts.

---

## The Registry (Data Derivation Pattern)

Graph Core uses **code-first, convention-based discovery** instead of manual central configuration:

```typescript
// Source: packages/product-tale-weaver-graph/src/node-types/scene.node-type.ts
export const sceneNodeType = defineNodeType({
  id: "scene",
  product: "tale-weaver",
  propertiesSchema: sceneNodePropertiesSchema,
  facets: { body: true, children: false },
  edges: { asSource: [], asTarget: [] },
  annotations: [],
  operations: ["create", "update", "delete"],
});
```

Auto-generated at build time:
- `packages/product-tale-weaver-graph/src/registry.generated.ts`
- `packages/product-journal-graph/src/registry.generated.ts`

**One definition → everything derived:**
| Derived | Purpose |
|---------|---------|
| `typeDef.createSchema` | API validation for creates |
| `typeDef.updateSchema` | API validation for updates |
| `typeDef.schema` | Validates complete node |
| `typeDef.facets` | UI rendering decisions |
| `typeDef.operations` | API capability gating |
| `typeDef.edges` | Allowed relationships |

---

## Block Types (Graph-Aware Bodies)

The review says "body is opaque TipTap JSON blob." **This is incomplete.** The codebase defines 4 block types that participate in the graph as first-class nodes:

| Block Type | File | Properties |
|------------|------|------------|
| `paragraph` | `graph-core/src/blocks/paragraph.block-type.ts` | `textContent` |
| `heading` | `graph-core/src/blocks/heading.block-type.ts` | `textContent`, `level` (1-6) |
| `list-item` | `graph-core/src/blocks/list-item.block-type.ts` | `textContent`, `checked` (optional) |
| `code-block` | `graph-core/src/blocks/code-block.block-type.ts` | `textContent`, `language` |

These use `defineNodeType()` exactly like product node types, enabling:
- **Sync layer:** `graph-core/src/sync/decompose.ts` — TipTap → block operations
- **Assemble layer:** `graph-core/src/sync/assemble.ts` — blocks → TipTap JSON

---

## Edge Types in Tale Weaver

Two edge types defined in `product-tale-weaver-graph/src/`:

| Edge Type | File | Source → Target | Properties |
|-----------|------|-----------------|------------|
| `scene-references-world-entity` | `edge-types/scene-references-world-entity.edge-type.ts` | `scene → story-world-entity` | `storyId` only |
| `story-world-relationship` | `edge-types/story-world-relationship.edge-type.ts` | `story-world-entity → story-world-entity` | `storyId`, `relationshipType`, `attributes`, `sortOrder` |

**Relationship types (enum):** `contracts/src/world.contract.ts:83-93`
```typescript
"wears" | "located-at" | "member-of" | "allied-with" | "rival-of" | "knows" | "owns" | "uses"
```

---

## Annotations in Tale Weaver

Defined via `defineAnnotationType()`, but **Tale Weaver product has zero annotation types** (`registry.generated.ts:21`):

```typescript
annotationTypes: [],
```

The Journal product has one: `packages/product-journal-graph/src/annotation-types/highlight.annotation-type.ts`

**Annotation type structure** (`define-annotation-type.ts`):
- `id` — unique identifier
- `propertiesSchema` — Zod schema for annotation-specific data
- `targetNodeTypes` — which node types can have this annotation
- `statuses` — lifecycle states (e.g., `["active", "resolved"]`)
- `anchored` — whether it can target a range within a body

---

## Product Scoping

Each product gets isolated node/edge/annotation types enforced at build time:

```typescript
// Source: packages/product-tale-weaver-graph/src/registry.generated.ts
export const taleWeaverProduct = defineProduct({
  id: "tale-weaver",
  label: "Tale Weaver",
  nodeTypes: ["scene", "story-world-entity"],
  edgeTypes: ["scene-references-world-entity", "story-world-relationship"],
  annotationTypes: [],  // none
});
```

The registry validates (`registry.ts:130-210`):
- Edge types reference node types that exist
- Annotation types reference node types that exist
- Node types reference edge/annotation types that exist
- Products reference node/edge/annotation types that exist
- No duplicate IDs

---

## Not Covered in Original Review

- **Block types** are first-class graph concepts, not opaque blobs
- **Two representations for session state:** `SessionState` (server) vs `GameState` (static runtime) — same fields, different contexts (`contracts/src/session.contract.ts`, `domain/src/types.ts`)
- **ReorderScenesRequest** — drag-and-drop scene ordering (`contracts/src/scene.contract.ts:69-77`)
- **Idempotency keys** on choice/action requests (`session.contract.ts:88`)
- **Domain error codes** — 12 specific errors (`session.contract.ts:134-144`)
- **Graph validation** — `validateGraph()` checks dangling choices, unreachable scenes, empty graphs (`domain/src/validate-graph.ts`)

---

## Key File References

| Concept | File |
|---------|------|
| Node type definition | `graph-core/src/define-node-type.ts` |
| Edge type definition | `graph-core/src/define-edge-type.ts` |
| Annotation type definition | `graph-core/src/define-annotation-type.ts` |
| Product definition | `graph-core/src/define-product.ts` |
| Registry construction | `graph-core/src/registry.ts` |
| Tale Weaver node types | `product-tale-weaver-graph/src/node-types/` |
| Tale Weaver edge types | `product-tale-weaver-graph/src/edge-types/` |
| Block types | `graph-core/src/blocks/` |
| TipTap sync (decompose) | `graph-core/src/sync/decompose.ts` |
| TipTap sync (assemble) | `graph-core/src/sync/assemble.ts` |