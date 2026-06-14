# Design Spec: Declarative Block-Choice Association Engine

Date: 2026-06-14
Status: Approved with Modifications

## Purpose

Implement structured Rich Content Blocks and a Declarative Block-Choice Association Engine. This allows authors to define nuanced scene layouts (using paragraphs, headers, and media blocks) and dynamically anchor transition choices to specific block elements by ID, giving consuming UIs complete layout and rendering freedom without hard-locking choices to a particular screen area or using confusing inline text shortcodes.

## Requirements

1. **Rich Node Content Schema (`packages/core/src/types.ts`):**
   - Extend `NodeInstance` and `NodeDefinition` schemas with an optional `blocks` array.
   - Each block in the array is defined as a `ContentBlock`:
     ```typescript
     export interface ContentBlock {
       id: string;
       type: "paragraph" | "header" | "image" | "video";
       text?: string;
       url?: string;
       level?: number;         // For headers (h1, h2, h3)
       caption?: string;       // For media captions
       metadata?: Record<string, unknown>; // Custom presentation-layer settings (e.g., delayAfterMs, animations, styling)
     }
     ```
   - **Backwards Compatibility:** If `blocks` is omitted, but `body` is present on a node, the parser MUST automatically synthesize a single paragraph block: `{ id: `${node.id}-body`, type: "paragraph", text: node.body }` to prevent breaking existing nodes or tests.

2. **Transition Anchor Property (`packages/core/src/types.ts` & `packages/runtime/src/types.ts`):**
   - Extend `EdgeInstance` and `Transition` schemas with an optional `anchorBlockId` string property.
   - **Fallback Rendering:** If a choice has no `anchorBlockId`, the client renders it in a default, general actions list (such as the footer button panel).

3. **Compiler Validation Rules (`packages/core/src/graph.ts`):**
   - Assert that if an edge specifies `anchorBlockId`, the source node of that edge MUST contain a content block with that exact ID. If it does not, validation fails with code `UNKNOWN_ANCHOR_BLOCK_ID` and a clear descriptive error message.

4. **Graph Definitions & UI Updates:**
   - Update `apps/literature-rpg/src/graphs/story.graph.ts` to implement the new structured `blocks` and `anchorBlockId` properties on our scenes.
    - Update the terminal TUI (`main.ts`) to render blocks sequentially, parsing and executing `block.metadata?.delayAfterMs` as short terminal pauses to pace the text beautifully!
   - Update the React Web UI (`App.tsx`) to render each block dynamically, mapping anchored choices to render inline next to or underneath their corresponding blocks, and using React timeouts to animate delayed block entries cleanly based on `block.metadata?.delayAfterMs`.

5. **Unit Tests:**
   - Add unit tests inside `graph-definition.test.ts` to assert that blocks and transition anchors are successfully compiled, preserved, and validated by the engine adapter, and that `UNKNOWN_ANCHOR_BLOCK_ID` validation errors are successfully raised on broken references.

---

## Code Architecture & UI Rendering Flow

```text
               GraphRuntime State Loaded (Node: main-hall)
                                    │
                                    ▼
                     Loop over Scene Content Blocks
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          ▼                         ▼                         ▼
   Block: intro-text         Block: archives-entry     Block: chasm-gate
   Render Paragraph          Render Image              Render Paragraph
          │                         │                         │
          │                         ▼                         ▼
          │                Is any Choice active?     Is any Choice active?
          │                (explore-archives)        (descend)
          │                         │                         │
          ▼                         ▼                         ▼
   [Text Block]              [Image Card]              [Chasm Block]
   "Dust motes..."           ┌────────────────┐        ┌────────────────┐
                             │ [Explore Book] │        │ [Go Down]      │
                             └────────────────┘        └────────────────┘
```
