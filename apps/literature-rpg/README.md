# literature-rpg

The reference consumer app for Fiction Map. Defined in [docs/NORTH_STAR.md](../../docs/NORTH_STAR.md) Milestone 3.7.a as a hard-gate deliverable: prove the public API is consumable from outside the framework's own test files.

This app deliberately uses only the public package surface — no deep imports, no internal types — so that any friction surfaced here is friction a real consumer would feel.

## What it does

A three-scene "library mystery" story:

```diagram
╭──────────╮  enter-hall    ╭───────────╮  descend (gated: hasEntity lantern)
│ entrance │ ─────────────▶ │ main-hall │ ──────────────────────────────────▶ ╭──────────────╮
╰──────────╯                ╰───────────╯                                     │ dark-chapter │
                                  │                                           ╰──────────────╯
                                  ▼
                          (grants lantern as effect of enter-hall)
```

- **Static layer:** [src/nodes/scene.node.ts](src/nodes/scene.node.ts), [src/edges/choice.edge.ts](src/edges/choice.edge.ts), [src/graphs/story.graph.ts](src/graphs/story.graph.ts) — discovered by `fiction-map generate`.
- **Runtime layer:** [src/main.ts](src/main.ts) — builds a `GraphRuntime`, walks the graph, prints the trace.
- **World:** [src/world.ts](src/world.ts) — one `item` entity (`lantern`).

## Setup

```bash
# from repo root
bun install
bun run build      # required: consumer pulls from packages/*/dist
```

## Run

```bash
# from this directory
bun run start      # walks the story, prints the trace
bun run test       # asserts the walk reaches dark-chapter
bun run typecheck  # tsc --noEmit
bun run generate   # writes src/.fiction-map/metadata.json and src/SEMANTICS.md
bun run validate   # checks the generated metadata
bun run journal:demo  # record/replay/fork demo for the session journal
```

## Session journal demo

[src/journal.ts](src/journal.ts) wires the `@fiction-map/runtime` session
journal (`JournalSession` + `SessionSave`) around the same story graph. It
adds one custom plugin — the non-deterministic `fortuneRoll` effect, declared
as a journaled capability — plus the same five global triggers as
[src/main.ts](src/main.ts). Because `JournalSession` builds its own runtime,
it cannot wrap `main.ts`'s `runtime`; the blueprint is derived with
`graphDefinitionToBlueprint(story)` instead.

```bash
bun run journal:demo   # records ~17 steps to victory, saves
                       # .fiction-map/session-demo.json, replays it
                       # identically (zero plugin calls), and forks a
                       # divergent branch
bun run test           # journal.test.ts covers record → save → replay → fork
```

The HTTP server and sidecar in `main.ts` are unchanged — this is a standalone
integration demo, not live-session rewiring.

## Why this app exists

To pull on the public API the way a real consumer would. Anything awkward, missing, or self-contradictory shows up immediately. Findings from building this app are captured in [NOTES.md](NOTES.md) and feed into Milestone 5 polish.

## What this app is NOT

- Not a UI demo
- Not a full RPG
- Not an example test — it lives in `apps/`, outside the framework's test trees, on purpose
