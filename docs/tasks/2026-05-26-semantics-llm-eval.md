# SEMANTICS LLM Evaluation

Date: 2026-05-26

## Purpose

Evaluate whether the current Milestone 4 agent surfaces answer real graph
questions cleanly enough for an LLM:

- `fiction-map query ...`
- `fiction-map graph show ...`
- `fiction-map explain ...`
- `SEMANTICS.md`

## Evaluation Questions

1. What paths lead to `dark-chapter`?
2. What does `descend` require?
3. Which nodes exist in the graph, and what type are they?
4. What are the roots and endings of the graph?

## Findings Before Improvement

1. `query paths` answered path-topology questions adequately.
2. `query nodes --type scene` answered graph inventory questions adequately.
3. `graph show` answered roots/endings/topology questions adequately after the
   metadata analysis fix.
4. `explain descend` exposed the main readability gap: conditions and effects
   were printed as raw JSON arrays rather than concise summaries.
5. `SEMANTICS.md` exposed the same gap at graph level: topology showed source,
   edge, and target, but omitted condition/effect summaries that matter for
   agent reasoning.

## Required Improvements

1. Render conditions and effects in `SEMANTICS.md` graph topology.
2. Render graph-level `conditionsUsed` and `effectsUsed` in `SEMANTICS.md`.
3. Make `fiction-map explain <edge-id>` print readable condition/effect
   summaries instead of JSON dumps.

## Success Criteria

After improvement, an agent should be able to answer "what does this edge
require?" and "what happens when this edge fires?" without opening the authored
source file first.
