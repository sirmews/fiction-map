---
name: using-fiction-map
description: Use this whenever a user is working in a project that uses Fiction Map and needs to inspect graph structure, understand nodes or edges, answer agent questions from generated artifacts, or make safe graph edits. Prefer this skill over ad hoc source-tree guessing whenever `fiction-map`, `metadata.json`, `SEMANTICS.md`, graph topology, node ids, edge ids, or path questions are involved.
---

# Using Fiction Map

Use the Fiction Map CLI and generated artifacts as the primary read interface.

The source code remains the system of record, but the fastest and safest way to
understand a graph project is:

1. read generated metadata
2. query the graph through the CLI
3. inspect source files only after the artifact-level picture is clear

This keeps agents grounded in the same contract that CI and other tools use.

## What This Skill Is For

Use this skill when the user asks any of the following kinds of questions:

- What graphs, nodes, or edges exist?
- How do these nodes connect?
- What paths exist through the graph?
- Which node or edge does this id refer to?
- What do the generated artifacts say?
- Can you update a Fiction Map graph safely?
- Why is validation failing?

Do not start by manually reverse-engineering the whole source tree when the CLI
can answer the question directly.

## Core Artifacts

Expect these generated artifacts:

- `.fiction-map/metadata.json`
- `SEMANTICS.md`

Treat them as derived outputs:

- never edit them by hand
- regenerate them from source when stale or missing
- use them to answer read-only questions before scanning many source files

## Core Commands

Use these commands first.

### Inventory

```bash
fiction-map query nodes
fiction-map query edges
fiction-map graph show <graph-id>
fiction-map explain <id>
```

### Filters

```bash
fiction-map query nodes --graph <graph-id> --type <node-type>
fiction-map query edges --graph <graph-id> --from <node-id>
fiction-map query edges --graph <graph-id> --to <node-id>
fiction-map query paths --graph <graph-id>
```

### Machine-readable output

```bash
fiction-map query nodes --json
fiction-map query edges --json
fiction-map query paths --json
fiction-map graph show <graph-id> --json
fiction-map explain <id> --json
```

### Regeneration and verification

```bash
fiction-map generate
fiction-map generate --check
fiction-map validate
fiction-map validate --strict
```

## Root Directory Discipline

Many projects keep Fiction Map source under `src/`.

If the generated artifacts live under `src/.fiction-map/metadata.json` and
`src/SEMANTICS.md`, run commands with:

```bash
fiction-map query nodes --root-dir src
fiction-map graph show <graph-id> --root-dir src
fiction-map explain <id> --root-dir src
```

If you are not sure where the root is:

1. look for `*.node.ts`, `*.edge.ts`, and `*.graph.ts`
2. look for `SEMANTICS.md`
3. use the directory that `fiction-map generate` scans

## Recommended Workflow

### When the user wants understanding

1. Run `fiction-map query nodes` to inventory node ids and types.
2. Run `fiction-map query edges` or `fiction-map graph show <graph-id>` to see topology.
3. Run `fiction-map explain <id>` for a node, edge, or graph the user asks about.
4. Read `SEMANTICS.md` when you need schema shape, source locations, or a concise
   project summary.

### When the user wants edits

1. Inspect the current graph through `query`, `graph show`, and `explain`.
2. Edit the authored source files (`*.node.ts`, `*.edge.ts`, `*.graph.ts`), not
   generated outputs.
3. Run `fiction-map generate`.
4. Run `fiction-map validate`.
5. Re-run `query`/`graph show` if you need to confirm the new graph shape.

### When the user asks about failures

1. Run `fiction-map validate`.
2. Use `fiction-map explain <id>` and `SEMANTICS.md` to ground the failing graph
   element.
3. Inspect the authored source only after the generated view identifies the
   failing node, edge, or graph.

## Important Boundaries

Keep these distinctions explicit.

### `query paths` is static topology

`fiction-map query paths` reports paths from metadata topology.

It does not execute runtime state transitions, conditions, or effects. Treat it
as a structural path view, not a gameplay or workflow simulator.

If the user is asking whether a path is available only after runtime conditions
or effects, inspect the relevant edge conditions/effects and, if needed, look at
the runtime code separately.

### `SEMANTICS.md` is descriptive, not executable

Use `SEMANTICS.md` to understand shape, source locations, and author intent.
Do not treat it as the place to edit behavior.

### Generated files are not the source of truth

Never propose editing:

- `.fiction-map/metadata.json`
- `SEMANTICS.md`

Always edit the authored source and regenerate.

## What Not To Do

- Do not guess graph structure from scattered source files before checking
  `metadata.json`.
- Do not manually patch generated artifacts.
- Do not treat `query paths` as runtime proof of traversal availability.
- Do not add a separate transport or server when a CLI query answers the
  question.
- Do not skip `generate`/`validate` after changing graph definitions.

## Quick Decision Rules

- User asks "what exists?" -> `query nodes`, `query edges`
- User asks "show me this graph" -> `graph show <graph-id>`
- User asks "what is this node/edge?" -> `explain <id>`
- User asks "what paths exist?" -> `query paths`
- User asks "why is this broken?" -> `validate`, then `explain`
- User asks "make a graph change" -> inspect with query tools, edit source,
  regenerate, validate

## Examples

**Example 1:**
User: "What nodes are in this graph project?"

Response pattern:

```bash
fiction-map query nodes --root-dir src
```

**Example 2:**
User: "Explain what `descend` does."

Response pattern:

```bash
fiction-map explain descend --root-dir src
```

**Example 3:**
User: "Add a new branch after `main-hall`."

Response pattern:

1. inspect current topology with `graph show library-mystery --root-dir src`
2. edit the authored graph source
3. run `fiction-map generate --root-dir src`
4. run `fiction-map validate --root-dir src`

