---
supersededBy: reviewing-fiction-map-architecture skill
reason: The project-specific code reality checks were moved into a dedicated wrapper skill (`reviewing-fiction-map-architecture`) rather than polluting the generic `gemini-architecture-review` skill. Additionally, the test cases in this document are obsolete since Milestone 4 is now complete.
---

1: # Task: Enhance Gemini Architecture Review Skill with Code-Reality Grounding
2: 
3: **Date**: 2026-05-20  
4: **File to modify**: `/Users/nav/.agents/skills/gemini-architecture-review/SKILL.md`  
5: **Trigger**: When the gemini-architecture-review skill is used to review documents against codebases
6: 
7: ---
8: 
9: ## Problem
10: 
11: During a review of Fiction Map's progress vs canonical documentation (`docs/NORTH_STAR.md`), Gemini CLI (v0.42.0) missed several critical issues that a local code inspection caught:
12: 
13: | Issue | Gemini Caught? | Local Agent Caught? |
14: |-------|-----------------|-------------------|
15: | Code-document contradiction (Milestone 4 marked 0% but `validate.ts`/`hooks.ts` exist) | ❌ | ✅ |
16: | Leaky abstraction (`GraphRuntime` exposes `GraphBlueprint` from adapter) | ❌ | ✅ |
17: | Unnecessary coupling (`builtin.ts` imports entity helpers from `../core/state`) | ❌ | ✅ |
18: | Registry minimalism (just Maps, no duplicate detection/events) | ❌ | ✅ |
19: | Tooling monoculture (Bun/TS monorepo only, no alternatives documented) | ❌ | ✅ |
20: | Two-layer validation architecture (static vs dynamic) | ❌ | ✅ |
21: 
22: The skill's prompt template lacks instructions for Gemini to cross-reference documents against actual implementation.
23: 
24: ---
25: 
26: ## Required Changes to SKILL.md
27: 
28: ### 1. Add New Sections to "Required Review Spine" (lines 52-68)
29: 
30: Add two new required output sections:
31: 
32: ```markdown
33: Add to required output sections:
34: 8. `Implementation reality check` (compare documented claims vs actual code)
35: 9. `Architectural anti-patterns detected` (type leaks, coupling, minimalism)
36: ```
37: 
38: ### 2. Update "Prompt Template" (lines 143-182)
39: 
40: Add this block before "Return exactly these sections:":
41: 
42: ```text
43: Additional instructions:
44: - Compare documented progress claims against the provided code summary
45: - Check for leaky abstractions: are internal types exposed in public interfaces?
46: - Identify unnecessary coupling between packages that should be independent
47: - Evaluate if implementations are too minimal (missing guardrails, no duplicate detection)
48: - Check if the architecture assumes specific tooling without documenting alternatives
49: - Identify multi-layer architectures (e.g., static + dynamic validation) and whether they're documented as complementary
50: ```
51: 
52: Update the sections list to include:
53: ```text
54: Return exactly these sections:
55: 1. What this is actually building
56: 2. Where the logic is coherent
57: 3. Where it is muddled or contradictory
58: 4. Biggest risks or self-deception
59: 5. What should happen next
60: 6. What should explicitly not be worked on yet
61: 7. Verdict
62: 8. Implementation reality check
63: 9. Architectural anti-patterns detected
64: 10. <mode-specific section>
65: 11. Grounding used
66: ```
67: 
68: ### 3. Update "Review Modes" Section (lines 38-50)
69: 
70: Add to mode heuristics:
71: 
72: ```markdown
73: - document mode: Add "document-code consistency" to heuristics
74: - architecture mode: Under `Boundary problems`, add: "Implementation quality (registries, minimalism, guardrails)"
75: ```
76: 
77: ### 4. Update "Repo Context Handling" (lines 184-195)
78: 
79: Add a new bullet point:
80: 
81: ```markdown
82: - include a short code reality summary from the local agent (what files exist, what tests pass, what anti-patterns were observed)
83: ```
84: 
85: ---
86: 
87: ## Success Criteria
88: 
89: After applying these changes, when the skill is triggered to review a document against a codebase, Gemini should:
90: 
91: 1. **Flag code-document contradictions** (e.g., "Document says 0% but validate.ts exists and works")
92: 2. **Detect leaky abstractions** (e.g., "GraphRuntime constructor exposes internal GraphBlueprint type")
93: 3. **Identify unnecessary coupling** (e.g., "builtin.ts imports from ../core/state creating soft dependency")
94: 4. **Evaluate implementation quality** (e.g., "Registry is minimal—just Maps with no duplicate detection")
95: 5. **Spot tooling assumptions** (e.g., "All tooling assumes Bun, no alternatives documented")
96: 
97: ---
98: 
99: ## Test Case
100: 
101: After updating the skill, test with:
102: 
103: ```bash
104: bash /Users/nav/.agents/skills/gemini-architecture-review/scripts/run_gemini_architecture_review.sh \
105:   --mode document \
106:   --model gemini-2.5-pro \
107:   --input-file docs/NORTH_STAR.md
108: ```
109: 
110: **Expected**: Gemini should flag that Milestone 4 is marked 0% complete but `packages/cli/src/commands/validate.ts` and `packages/cli/src/commands/hooks.ts` already exist.
111: 
112: ---
113: 
114: ## Context Summary for Agent
115: 
116: When actioning this task, the local agent should provide Gemini with:
117: - The document being reviewed (e.g., `docs/NORTH_STAR.md`)
118: - A short code reality summary: "Milestone 4 says 0% but validate.ts and hooks.ts exist in packages/cli/src/commands/. 105 tests pass. Registry in packages/core/src/registry.ts is minimal (Maps + clear only)."
119: 
120: This ensures Gemini has the context needed to perform the reality check.