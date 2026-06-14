# Design Spec: Multi-Format Graph Output Support for CLI

Date: 2026-06-14
Status: Draft

## Purpose

Add multi-format support to the `fiction-map ascii` CLI subcommand, allowing authors, systems, and LLMs to inspect the same authored graph in the format most suited to their needs. This replaces the hardcoded layout logic with flexible formatters: `terminal` (Unicode tree boxes), `llm` (compact Markdown lists), and `mermaid` (Mermaid.js charts).

## Requirements

1. **CLI Parameter `--format <mode>` / `-f <mode>`:**
   - **`terminal` (default):** Renders the box-framed Unicode vertical DFS tree.
   - **`llm`:** Outputs a compact, token-efficient Markdown adjacency list format representing nodes, types, and edges with conditions/effects.
   - **`mermaid`:** Outputs a standardized ````mermaid ``` block mapping the topology.
2. **Flexible API Strategy:**
   - Decouple output format generation into dedicated formatting functions inside `packages/cli/src/commands/ascii.ts`.
   - Keep the primary CLI parsing logic, load/select helpers, and cycle/DAG detection generic.
3. **Integration and Unit Tests:**
   - Add unit tests for the `llm` and `mermaid` formatting outputs.

## Format Definitions

### 1. `llm` Formatter
Generates a structured flat Markdown overview of the graph:
```markdown
# Graph: [graph-id]

* **[node-id]** ([node-type])
  * Title: "[title]"
  * Body: "[body-snippet]"
  * Choices:
    * `[edge-id]` ──► **[target-id]** ("text-label")
      * ❓ conditions: [conditions]
      * ⚡ effects: [effects]
```

### 2. `mermaid` Formatter
Generates a standard Mermaid.js flowchart block:
```text
```mermaid
graph TD
  [node-id]["[node-id] ([node-type])<br/>[node-title]"] -->|[edge-id]: [text] / conditions: [conds] / effects: [effs]| [target-id]["..."]
```
```

## Proposed Code Architecture

We will extend `packages/cli/src/commands/ascii.ts` to include:
- `generateLlmMap(graph)`
- `generateMermaidMap(graph)`
- Update `generateAsciiMap(graph)` -> `generateTerminalMap(graph)`
- Register options `format` and `f` in `packages/cli/src/cli.ts` command arguments.
