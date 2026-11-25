# Documentation map

Canonical documentation for Fiction Map. Start here to find the right layer.

## North star

- [NORTH_STAR.md](../NORTH_STAR.md) — what we're building and why (engine/framework, not consumer apps)
- [CONTEXT.md](../CONTEXT.md) — the domain glossary: canonical vocabulary for graphs, runtime, plugins, sessions

## Decisions (ADRs)

Dated decision records in [decisions/](decisions/). Read newest-first when entering an area.

- [Headless Engine Direction](decisions/2026-05-16-headless-engine-direction.md) — engine vs. consumer-app boundary
- [LLM-Friendly Artifact Strategy](decisions/2026-06-20-llm-friendly-artifact-strategy.md) — when to generate artifacts vs. annotate
- [Persistence Contract](decisions/2026-05-20-persistence-contract.md) — save/state contracts
- [Session Journal & Replay](decisions/2026-11-25-session-journal-replay.md) — deterministic replay of plugin-influenced sessions *(proposed)*

## Design

- [design/story-runtime-design.md](design/story-runtime-design.md) — runtime architecture and core types
- [design/block-editor-research.md](design/block-editor-research.md) — editor landscape research

## Plans

Active and completed consumer-app plans in [plans/](plans/), notably
[plans/literature-rpg/](plans/literature-rpg/) and the
[gap analysis](plans/2026-05-16-literature-rpg-gap-analysis.md).
Engine plans include
[session-journal-implementation.md](plans/session-journal-implementation.md)
(deterministic record/replay for plugin-influenced sessions).

## Reference

- [api/](api/) — per-package API docs
- [consumer-usage-guide.md](consumer-usage-guide.md) — how consumer apps use the engine
- [rpg-primitives-matrix.md](rpg-primitives-matrix.md) — RPG-domain primitive survey
- [self-hosting.md](self-hosting.md) — deployment guide

## Working notes (not canonical)

- [research/](research/) — source-backed investigations
- [tasks/](tasks/) — task briefs
- [`2026-05-20-progress-vs-canonical-docs.md`](2026-05-20-progress-vs-canonical-docs.md) — rationale for separating stable docs from working notes
- `architecture-review-*.md`, `public-api-audit.md` — point-in-time audits
