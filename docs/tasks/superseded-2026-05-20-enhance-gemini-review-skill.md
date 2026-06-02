# Task: Enhance Gemini Architecture Review Skill with Code-Reality Grounding

**Date**: 2026-05-20  
**File to modify**: `/Users/nav/.agents/skills/gemini-architecture-review/SKILL.md`  
**Trigger**: When the gemini-architecture-review skill is used to review documents against codebases

---

## Problem

During a review of Fiction Map's progress vs canonical documentation (`docs/NORTH_STAR.md`), Gemini CLI (v0.42.0) missed several critical issues that a local code inspection caught:

| Issue | Gemini Caught? | Local Agent Caught? |
|-------|-----------------|-------------------|
| Code-document contradiction (Milestone 4 marked 0% but `validate.ts`/`hooks.ts` exist) | ❌ | ✅ |
| Leaky abstraction (`GraphRuntime` exposes `GraphBlueprint` from adapter) | ❌ | ✅ |
| Unnecessary coupling (`builtin.ts` imports entity helpers from `../core/state`) | ❌ | ✅ |
| Registry minimalism (just Maps, no duplicate detection/events) | ❌ | ✅ |
| Tooling monoculture (Bun/TS monorepo only, no alternatives documented) | ❌ | ✅ |
| Two-layer validation architecture (static vs dynamic) | ❌ | ✅ |

The skill's prompt template lacks instructions for Gemini to cross-reference documents against actual implementation.

---

## Required Changes to SKILL.md

### 1. Add New Sections to "Required Review Spine" (lines 52-68)

Add two new required output sections:

```markdown
Add to required output sections:
8. `Implementation reality check` (compare documented claims vs actual code)
9. `Architectural anti-patterns detected` (type leaks, coupling, minimalism)
```

### 2. Update "Prompt Template" (lines 143-182)

Add this block before "Return exactly these sections:":

```text
Additional instructions:
- Compare documented progress claims against the provided code summary
- Check for leaky abstractions: are internal types exposed in public interfaces?
- Identify unnecessary coupling between packages that should be independent
- Evaluate if implementations are too minimal (missing guardrails, no duplicate detection)
- Check if the architecture assumes specific tooling without documenting alternatives
- Identify multi-layer architectures (e.g., static + dynamic validation) and whether they're documented as complementary
```

Update the sections list to include:
```text
Return exactly these sections:
1. What this is actually building
2. Where the logic is coherent
3. Where it is muddled or contradictory
4. Biggest risks or self-deception
5. What should happen next
6. What should explicitly not be worked on yet
7. Verdict
8. Implementation reality check
9. Architectural anti-patterns detected
10. <mode-specific section>
11. Grounding used
```

### 3. Update "Review Modes" Section (lines 38-50)

Add to mode heuristics:

```markdown
- document mode: Add "document-code consistency" to heuristics
- architecture mode: Under `Boundary problems`, add: "Implementation quality (registries, minimalism, guardrails)"
```

### 4. Update "Repo Context Handling" (lines 184-195)

Add a new bullet point:

```markdown
- include a short code reality summary from the local agent (what files exist, what tests pass, what anti-patterns were observed)
```

---

## Success Criteria

After applying these changes, when the skill is triggered to review a document against a codebase, Gemini should:

1. **Flag code-document contradictions** (e.g., "Document says 0% but validate.ts exists and works")
2. **Detect leaky abstractions** (e.g., "GraphRuntime constructor exposes internal GraphBlueprint type")
3. **Identify unnecessary coupling** (e.g., "builtin.ts imports from ../core/state creating soft dependency")
4. **Evaluate implementation quality** (e.g., "Registry is minimal—just Maps with no duplicate detection")
5. **Spot tooling assumptions** (e.g., "All tooling assumes Bun, no alternatives documented")

---

## Test Case

After updating the skill, test with:

```bash
bash /Users/nav/.agents/skills/gemini-architecture-review/scripts/run_gemini_architecture_review.sh \
  --mode document \
  --model gemini-2.5-pro \
  --input-file docs/NORTH_STAR.md
```

**Expected**: Gemini should flag that Milestone 4 is marked 0% complete but `packages/cli/src/commands/validate.ts` and `packages/cli/src/commands/hooks.ts` already exist.

---

## Context Summary for Agent

When actioning this task, the local agent should provide Gemini with:
- The document being reviewed (e.g., `docs/NORTH_STAR.md`)
- A short code reality summary: "Milestone 4 says 0% but validate.ts and hooks.ts exist in packages/cli/src/commands/. 105 tests pass. Registry in packages/core/src/registry.ts is minimal (Maps + clear only)."

This ensures Gemini has the context needed to perform the reality check.
