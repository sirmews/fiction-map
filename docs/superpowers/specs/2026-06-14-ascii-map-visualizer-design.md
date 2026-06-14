# Design Spec: ASCII Map Visualizer for Fiction Map Graphs

Date: 2026-06-14
Status: Draft

## Purpose

Provide a native CLI command, `fiction-map ascii <graph-id>`, to render a beautiful, highly informative, and structured tree representation of any story graph in a terminal window. This provides instant visual feedback to authors and AI agents about the structure, condition gating, and transition consequences of the authored scenes.

## Requirements

1. **Native CLI Command:** Add a subcommand `ascii` (aliases: `map`, `draw`) to the `fiction-map` CLI.
2. **Read from Generated Metadata:** Load nodes, edges, conditions, and effects from the verified `.fiction-map/metadata.json` using existing helpers.
3. **Vertical Tree Layout:** Render the topology starting from the root node(s) down, using Unicode box-drawing characters (`┌`, `└`, `├`, `│`, `─`, `▲`, `▼`, `►`).
4. **Detail Rich Output:**
   - Display node IDs, node types, titles, and body snippets (truncated to fit).
   - Display edge/transition IDs, text labels, and types.
   - Print inline conditions (`❓ conditions: ...`) and effects (`⚡ effects: ...`) neatly aligned under transition branches.
5. **Cycle Detection & De-duplication:** Track already visited nodes in the DFS traversal path. If a node is visited again (e.g., in a cycle or cross-link), render a clear pointer reference, e.g., `──► (see node-id)` instead of recursing infinitely.
6. **Standalone Verification:** Add unit tests to verify the layout generation logic against sample graphs.

## Architecture & Data Flow

The layout calculation takes place inside `packages/cli/src/commands/ascii.ts` (or integrated within `query.ts`). It performs a Depth-First Search (DFS) on the parsed graph topology.

### Input Data
- `GraphDefinition` from `metadata.json`:
  ```json
  {
    "id": "graph-id",
    "nodes": [{"id": "...", "type": "...", "title": "...", "body": "..."}],
    "edges": [{"id": "...", "type": "...", "source": "...", "target": "...", "text": "...", "conditions": [], "effects": []}]
  }
  ```

### Drawing Logic & Box Framing
For each node, we construct a block:
```text
┌──────────────────────────────────────┐
│ entrance (scene)                     │
│ "You stand at the entrance to..."    │
└──────────────────────────────────────┘
```

For edges/transitions, we format line connectors:
- Simple child branch:
  ```text
     │
     ▼ [choice-id] "Action Label"
     │ ⚡ effects: grantEntity(item)
     ▼
  ```
- Split/Multiple branching choices:
  ```text
     ├───► [choice-1-id] "First Choice"
     │     ❓ conditions: hasEntity(...)
     │     ▼
     │   ┌──────────────────────────────────────┐
     │   │ ...                                  │
     │   └──────────────────────────────────────┘
     │
     └───► [choice-2-id] "Second Choice"
           ▼
         ┌──────────────────────────────────────┐
         │ ...                                  │
         └──────────────────────────────────────┘
  ```

- To draw correct indentation lines, we maintain an array of boolean flags representing whether a vertical path line (`│`) is active at each depth level.

## Testing Strategy

- **CLI integration tests:** Verify command parser invokes the ASCII visualizer without failing.
- **Visualizer unit tests:** Add test suite `packages/cli/src/commands/ascii.test.ts` to assert that correct strings are printed and cycles are detected correctly without looping infinitely.
