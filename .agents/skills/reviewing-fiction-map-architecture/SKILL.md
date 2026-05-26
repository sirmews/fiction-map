---
name: reviewing-fiction-map-architecture
description: Use when the user asks Gemini to critique a fiction-map architecture doc, North Star, milestone plan, or design note and expects the review to be grounded in the actual fiction-map code. Use this instead of the generic gemini-architecture-review skill whenever the target document lives under docs/ in this repo and a code-vs-document consistency check matters.
---

# Reviewing Fiction Map Architecture

Project-local specialization of `gemini-architecture-review` for the fiction-map repo.

The generic skill reviews documents in isolation. That is not enough here: most fiction-map docs (NORTH_STAR.md, milestone plans, decisions) make progress claims about packages that already exist on disk. A useful review must compare those claims against the current source tree.

This skill exists to force that grounding step before Gemini is invoked.

## When To Use

Use this skill when all of these are true:

- the user wants Gemini's second opinion
- the input is a doc inside `docs/` of this repo (or pasted text describing fiction-map)
- a code-vs-document consistency check would change the review's conclusions

If the input is a generic prompt or a non-fiction-map doc, fall back to the user-level `gemini-architecture-review` skill.

Do not use this skill for code diff review.

## What This Skill Adds On Top Of The Base Skill

Three additions, in order of importance:

1. A mandatory code-reality summary collected by the local agent before Gemini runs.
2. One extra required output section: `Code-vs-document consistency`.
3. Two extra prompt bullets that tell Gemini to use that summary.

Everything else (review-only discipline, helper script, response handling, grounding rules) is inherited from `/Users/nav/.agents/skills/gemini-architecture-review/SKILL.md`. Do not duplicate those rules here; follow them.

## Repo Map (Reference For The Code Reality Summary)

Fiction-map is a Bun + TypeScript monorepo:

- `packages/core` — graph runtime, registry, state, validation
- `packages/cli` — `validate`, `hooks`, and other commands
- `packages/entities` — entity types and helpers
- `packages/story-runtime` — runtime adapter
- `docs/NORTH_STAR.md` — canonical direction
- `docs/plans/` — milestone implementation plans
- `docs/decisions/` — architectural decisions

When building a code-reality summary, look here first.

## Required Code Reality Summary

Before invoking Gemini, the local agent must produce a short summary (under ~25 lines) covering only what the document being reviewed actually claims about. Do not dump the repo.

The summary must answer:

- Which files or modules does the document claim exist, are missing, or have a given status?
- For each, what is the actual state on disk right now? (exists / missing / partial)
- What does the most recent passing test count look like, if the document makes a claim about test health?
- Are there obvious contradictions between documented progress (e.g. "Milestone N: 0%") and on-disk artifacts?

Save this summary to `.gemini-review/<doc-slug>-code-reality.md` and pass it via `--instructions-file` to the helper script. Keep it factual. No opinions.

If you cannot ground a particular claim, write `unknown` rather than guessing.

## Required Review Spine (Extends Base Skill)

In addition to the 7 sections + 1 mode-specific section + `Grounding used` from the base skill, this skill requires:

- `Code-vs-document consistency` — placed immediately before the mode-specific section.

If no code reality summary was provided (which should not happen when this skill is loaded), Gemini must output `Code-vs-document consistency: no code context provided` rather than fabricate findings.

## Prompt Additions

When building the Gemini prompt, after the base template's review constraints and before `Return exactly these sections:`, append:

```text
Project context: fiction-map, a Bun + TypeScript monorepo (packages/core, packages/cli, packages/entities, packages/story-runtime).

A code reality summary is included with this review. Use it to:
- flag any place the document's progress or status claims contradict what the summary says exists on disk
- flag leaky abstractions or cross-package coupling that are visible in the summary
- do not invent findings for code that is not in the summary; if a claim cannot be checked, say so
```

Update the section list returned to Gemini so `Code-vs-document consistency` appears immediately before the mode-specific section.

## Helper Script

Reuse the base skill's helper script. Pass the code reality summary as an instructions file:

```bash
bash /Users/nav/.agents/skills/gemini-architecture-review/scripts/run_gemini_architecture_review.sh \
  --mode document \
  --model gemini-2.5-pro \
  --input-file docs/NORTH_STAR.md \
  --instructions-file .gemini-review/north-star-code-reality.md
```

`.gemini-review/` is the right place for both the summary and Gemini's output artifacts. Add it to `.gitignore` if it is not already ignored.

## Workflow

1. Confirm the input is a fiction-map doc and code grounding matters. Otherwise hand off to the base skill.
2. Read the doc. Extract every claim that is checkable against the source tree.
3. Inspect the relevant files under `packages/` and `docs/`. Run tests only if the doc makes a test-health claim.
4. Write the code reality summary to `.gemini-review/<doc-slug>-code-reality.md`.
5. Run the helper script with `--input-file <doc>` and `--instructions-file <summary>`, injecting the prompt additions above.
6. Return Gemini's critique verbatim, labeled as Gemini output, with one framing line noting that a code reality summary was provided.

## Failure Modes To Watch For

- Gemini ignores the summary and reviews the doc in isolation. If `Code-vs-document consistency` is empty or generic, rerun with the summary moved earlier in the prompt and named explicitly.
- Local agent pads the summary with opinions. Strip them; the summary is facts only.
- Local agent dumps full file contents into the summary. Replace with one-line status entries (`packages/cli/src/commands/validate.ts: exists, 142 lines, last modified 2026-05-18`).
- Gemini claims to have edited files. Treat as a process failure per base skill rules.
