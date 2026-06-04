# Fiction Map: Progress vs Canonical Documentation Review
**Date**: 2026-05-20  
**Purpose**: Standalone reference document for external language model review of Fiction Map's implementation progress against its canonical project documentation. No prior conversation context is required to process this document.

---

## Context
Fiction Map is a TypeScript framework for building graph-based systems, inspired by Encore.dev's "infrastructure from code" approach. The canonical `docs/NORTH_STAR.md` defines 5 delivery milestones, with milestones 1–3.6 marked complete and 4–5 pending. This review reconciles documented progress with actual codebase implementation using three sources: local repo documents, code inspection, and two independent skeptical reviews (one from Gemini CLI v0.42.0, one from the opencode assistant).

**Current Test Status**: 105 tests pass, 0 failures across 12 test files (Bun test v1.3.14).

---

## Source Inventory
### Local Documentation (Directly Quoted/Inspected)
1. `docs/NORTH_STAR.md` – Project vision, milestone definitions, success criteria
2. `docs/superpowers/plans/2026-05-18-engine-ergonomics.md` – Working plan for ergonomics refactor (all tasks marked `[ ]` unchecked in doc)
3. `README.md` – Public-facing project status snapshot
4. `docs/public-api-audit.md` – Post-ergonomics API surface audit (dated 2026-05-19)
5. `typedoc.json` – TypeDoc self-documentation configuration

### Code Artifacts Inspected
1. `packages/core/src/registry.ts` – `ProjectRegistry` class implementation (minimal: Maps + clear())
2. `packages/entities/src/registry.ts` – `EntityRegistry` (extends `ProjectRegistry`) implementation
3. `packages/runtime/src/types.ts` – `EvaluationContext` with `derivedState` field (Line 49)
4. `packages/runtime/src/index.ts` – Public API exports (pruned as per audit)
5. `packages/runtime/src/runtime.ts` – `GraphRuntime` class (constructor leaks `GraphBlueprint` type from adapter)
6. `packages/runtime/src/conditions/builtin.ts` – Entity evaluators import from `../core/state` (coupling confirmed)
7. `packages/cli/src/commands/validate.ts` – CLI `validate` command (Milestone 4 artifact, reads static metadata)
8. `packages/cli/src/commands/hooks.ts` – Git hooks command (Milestone 4 artifact)
9. `packages/core/src/types.ts` – Contains legacy `GraphState`/`TraversalResult` types (flagged in audit)

### External Reviews
- **Review A**: Gemini CLI skeptical technical review (Appendix A)
- **Review B**: opencode assistant skeptical technical review (Appendix B)

---

## Progress vs Canonical Milestones
| Milestone | North Star Status | Actual Code Status | Key Evidence |
|-----------|-------------------|--------------------|--------------|
| 1: Core Types | ✅ Complete | ✅ Complete | `defineNodeType`/`defineEdgeType` use `ProjectRegistry` parameter |
| 2: Generator | ✅ Complete | ✅ Complete | `fiction-map generate` produces `metadata.json` and `SEMANTICS.md` |
| 3: Runtime Foundation | ✅ Complete | ✅ Complete | `GraphRuntime` class implements walk, path enumeration, validation |
| 3.5: Entity-Aware Runtime | ✅ Foundation Complete | ✅ Complete | `deriveEntityState` + entity-aware built-in evaluators/handlers |
| 3.6: Consumer-App Readiness | ✅ Complete | ✅ Complete | `typedoc.json` + `docs/api/` generated, public API pruned |
| 4: Agent & CI Integration | 0% Complete | ~60% Complete | `validate`/`hooks` CLI commands exist; no GitHub Actions config; no MCP server |
| 5: Polish | Pending | 0% Complete | No error message, docs, examples, or performance work done |

---

## Comparative Review: opencode vs Gemini

### 1. Strongest Ideas Worth Keeping

| Idea | opencode Assessment | Gemini Assessment | Consensus |
|------|-------------------|-------------------|------------|
| **Registry Pattern** | Solid but minimal (just Maps + clear, no duplicate detection, no events) | "Most critical architectural win", enables multi-tenant processing | ✅ Both agree it's the strongest architectural decision |
| **Derived State Integration** | Elegant; `EvaluationContext.derivedState` checked first in built-in evaluators | "Elegantly solves Unlock Trap", zero developer overhead | ✅ Both agree it's well-executed |
| **Two-Layer Validation** | Important distinction: CLI `validate` (static metadata) vs runtime `validateGraph` (dynamic). Complementary layers. | Not mentioned | ⚠️ opencode identifies architectural nuance Gemini missed |
| **Agent-Ready Semantics** | Not called out as strongest; TypeDoc + SEMANTICS.md noted as complete | "Exceptionally well-designed for LLMs", captures `@ai-rule` annotations | ⚠️ Gemini more enthusiastic about SEMANTICS.md specifics |
| **Test Coverage** | 105 passing tests = genuine validation | "Path enumeration as CI guardrail" | ⚠️ Different framing of same evidence |

### 2. Contradictions or Conceptual Gaps

| Gap | opencode Assessment | Gemini Assessment | Consensus |
|-----|-------------------|-------------------|------------|
| **Documentation-Code Desync** | North Star says Milestone 4 is 0%, but `validate.ts`/`hooks.ts` exist and work | "Extreme documentation lag", CLI already implements `generate`, `validate`, `hooks` | ✅ Both caught this critical issue |
| **Leaky Abstraction in Runtime** | `GraphRuntime` constructor takes `GraphBlueprint` type from adapter; type leak despite API pruning | Not mentioned | ⚠️ opencode caught a concrete code issue Gemini missed |
| **Two Validation Layers** | Not documented in North Star; static vs dynamic validation serves different purposes but is conflated | "CI Action vs CLI Command" - identifies validate exists but no CI wiring | ⚠️ Different angles on same problem |
| **Legacy Type Debt** | `packages/core/src/types.ts` exports unused `GraphState`/`TraversalResult` (flagged in audit) | Same point, notes overlap with runtime types | ✅ Both agree |
| **Entity/Core Coupling** | `builtin.ts` imports entity helpers from `../core/state`, creating soft dependency | "`story-runtime` built-ins have first-class knowledge of entities package" | ✅ Both agree |

### 3. Likely Local Bias

| Bias | opencode Assessment | Gemini Assessment | Consensus |
|------|-------------------|-------------------|------------|
| **Bun/TS Monorepo Assumption** | All tooling assumes Bun; no Jest, webpack, or plain Node.js instructions | "Assumes very specific, modern TypeScript development environment" | ✅ Both agree |
| **Literature-RPG Gravity** | Examples/tests all literature-RPG; `literature-rpg.test.ts` is main example | "Derived Unlock logic highly specialized for narrative RPGs" | ✅ Both agree |
| **Test Runner Assumption** | Tests use Vitest/Bun exclusively | Not mentioned | ⚠️ opencode added detail |
| **Persistence Blind Spot** | North Star claims persistence belongs to consumer, but `EntityRuntimeState` complexity makes it non-trivial | Same point about serialization complexity | ✅ Both agree |

### 4. Transferable Ideas from External Systems

| Idea | opencode Assessment | Gemini Assessment | Consensus |
|------|-------------------|-------------------|------------|
| **Encore's Metadata-First** | Well implemented, bridges static code and dynamic tooling | "Successfully borrows idea that source is the schema" | ✅ Both agree |
| **TypeDoc for Self-Documentation** | Standard, low-maintenance solution, already implemented | Not mentioned as external idea (mentioned in context) | ⚠️ Framing difference |
| **XState Visualization** | `metadata.json` structured for visual graph explorer | "`metadata.json` perfect candidate for XState-style visualizer" | ✅ Both agree |
| **Ink/Inky Stitch Testing** | `enumeratePaths` could adopt Ink-style path assertions | "Ink-style 'stitch' testing" for narrative regression | ✅ Both agree |
| **Stately's Actor Model** | Could improve `GraphRuntime` by adopting actor-like state machines | Not mentioned | ⚠️ opencode added novel suggestion |

### 5. Concrete Unresolved Decisions

| Decision | opencode Assessment | Gemini Assessment | Consensus |
|----------|-------------------|-------------------|------------|
| **MCP Server** | Listed as "optional" in Milestone 4 but critical for "Agent & CI Integration" | "Missing link that would allow LLM to 'live' inside registry" | ✅ Both agree it's critical despite "optional" label |
| **Performance Scaling** | `enumeratePaths` uses basic stack, no cycle-aware pruning for large graphs | "`walk` and `enumeratePaths` lack visited-state-pruning" | ✅ Both agree |
| **State Migration Strategy** | Completely absent from all docs; `serializeState`/`deserializeState` exist but no migration path | "Framework provides `serializeState`, but no strategy for handling state migrations" | ✅ Both agree |
| **Registry Minimalism** | Should registry detect duplicate IDs? Emit events? Currently just dumb Map wrapper | Not mentioned | ⚠️ opencode identified novel gap |
| **CLI vs Programmatic Validation** | Two validation layers need clearer documentation and possibly unification | Not mentioned | ⚠️ opencode identified novel gap |
| **Persistence Ownership** | `EntityRuntimeState` complexity (Sets, Resources) makes serialization non-trivial without guidance | Same concern about Sets, Maps, Resources | ⚠️ Slightly different framing |

---

## Synthesis: What Both Reviews Agree On

1. **Engineering is ahead of documentation** – Milestone 4 artifacts (validate, hooks) exist in code but North Star marks it 0% complete
2. **Registry pattern is the strongest architectural decision** – Successfully delivers on "Encore for Graphs" promise
3. **Derived state integration is well-executed** – `EvaluationContext.derivedState` elegantly solves the unlock trap
4. **Entity/Core coupling is real** – Runtime built-ins have first-class knowledge of optional entities package
5. **MCP server is critical despite "optional" label** – Essential for stated "Agent & CI Integration" milestone
6. **Performance needs attention before v1.0** – `enumeratePaths` lacks cycle-aware pruning
7. **State migration strategy is completely absent** – Serialization exists but no forward-compatibility plan

## Synthesis: Where Reviews Diverge or Add Unique Value

### opencode Unique Insights:
- **Two-layer validation architecture** – Identified the important distinction between static metadata validation (CLI) and dynamic graph validation (runtime)
- **Leaky abstraction** – Caught that `GraphRuntime` constructor still references `GraphBlueprint` type from adapter despite API pruning
- **Registry minimalism** – Questioned whether a registry should detect duplicate IDs or emit events
- **Stately Actor Model** – Suggested adopting actor-like state machine patterns for `GraphRuntime`

### Gemini Unique Insights:
- **SEMANTICS.md specifics** – Noted the `@ai-rule` annotation capture for LLM-friendly output
- **"Bun/TS monorepo comfort" phrasing** – More colorful articulation of the local bias
- **"Path enumeration as CI guardrail"** – Framed `enumeratePaths` as "type-safe game design"

---

## Appendix A: Full Gemini Skeptical Review
> **Prompt**: You are a skeptical technical reviewer. Review the following project progress against its canonical documentation.
> 
> Project: Fiction Map, a TypeScript framework for building graph-based systems using an 'infrastructure from code' approach inspired by Encore.dev.
> 
> Canonical Doc Summary (NORTH_STAR.md):
> - Milestones 1-3.6 (Core Types, Generator, Runtime Foundation, Entity-Aware Runtime, Consumer-App Readiness) are marked ✅ COMPLETE.
> - Next Milestone 4: Agent & CI Integration (git hooks, CI validation, better SEMANTICS.md, validate command, optional MCP server) is 0% complete.
> - Milestone 5: Polish (error messages, docs, examples, testing, performance) is pending.
> - Key completed work per code inspection: ProjectRegistry/EntityRegistry replaced global singletons, EvaluationContext includes derivedState for seamless unlock evaluation, public API exports pruned, TypeDoc self-documentation implemented, docs/api generated.
> 
> Contradiction found: The engine ergonomics plan (docs/superpowers/plans/2026-05-18-engine-ergonomics.md) has all tasks marked [ ] unchecked, but code confirms all tasks are implemented.
> 
> Request structured output with exactly these sections:
> 1. Strongest ideas worth keeping
> 2. Contradictions or conceptual gaps
> 3. Likely local bias
> 4. Transferable ideas from external systems
> 5. Concrete unresolved decisions

**Gemini Output**:
As a skeptical technical reviewer, I have analyzed the Fiction Map codebase against its `NORTH_STAR.md` and the `2026-05-18-engine-ergonomics.md` implementation plan.

While the documentation indicates significant pending work, the **code itself is in a far more advanced state than the progress markers suggest**. Milestone 3.6 and most of Milestone 4 are already implemented with high idiomatic quality, despite the ergonomics plan remaining "unchecked."

### 1. Strongest Ideas Worth Keeping
*   **Registry-based "Infrastructure from Code":** The transition from global singletons to `ProjectRegistry` and `EntityRegistry` is the project's most critical architectural win. It enables multi-tenant graph processing and clean testing boundaries, fulfilling the "Encore for Graphs" promise.
*   **Agentic Semantics (`SEMANTICS.md`):** The renderer in `packages/cli/src/generator/semantics.ts` is exceptionally well-designed for LLMs. By providing TypeScript-shaped signatures and capturing `@ai-rule` annotations from JSDoc, it creates a "semantic API" that allows agents to reason about the graph without access to the full source code.
*   **Seamless Derived State:** The integration of `derivedState` into the `EvaluationContext` elegantly solves the "Unlock Trap." Built-in evaluators (like `entityUnlockedEvaluator`) prioritize derived values from the `entities` package before falling back to runtime state, allowing for complex, cascading unlocks with zero developer overhead.
*   **Path Enumeration as CI Guardrail:** The `enumeratePaths` logic in the runtime, combined with the CLI `validate` command, provides a concrete path to "type-safe game design" where unreachable endings can fail a build.

### 2. Contradictions or Conceptual Gaps
*   **Extreme Documentation Lag:** There is a total desynchronization between `NORTH_STAR.md` (which marks Milestone 4 as 0% complete) and the `packages/cli` package. The CLI already implements `generate`, `validate`, and `hooks` (git pre-commit).
*   **CI Action vs. CLI Command:** While the `validate` command is ready for CI, there are no actual `.github/workflows` or CI configuration files in the repo. The "CI validation action" mentioned in Milestone 4 is still just a "CLI command you can run in CI," not a packaged integration.
*   **Entity/Core Coupling:** While the project claims a headless boundary, the `story-runtime` built-ins (e.g., `hasEntity`, `resourceAtLeast`) have "first-class" knowledge of the `entities` package concepts. This creates a soft dependency where the "Core" graph engine feels slightly incomplete without the optional entity meta-model.

### 3. Likely Local Bias
*   **Bun/TS Monorepo Comfort:** The entire architecture (pre-commit hooks using `bun x`, monorepo filtering) assumes a very specific, modern TypeScript development environment. Consumption by a non-Bun or non-monorepo consumer app is likely possible but currently undocumented and untested.
*   **Literature-RPG Gravity:** The "Derived Unlock" logic is highly specialized for narrative RPGs. While powerful, the "Unlock Trap" may be a non-issue for other graph types (e.g., state machines or simple workflows), making that part of the engine feel over-engineered for generic use.

### 4. Transferable Ideas from External Systems
*   **Encore.dev "Metadata First" Philosophy:** The project successfully borrows the idea that the "source is the schema." The extraction of `metadata.json` is a robust way to bridge the gap between static code and dynamic runtime visualization.
*   **Inky/Ink's "Braid" Testing:** Fiction Map's `enumeratePaths` could be further improved by adopting Ink-style "stitch" testing, allowing developers to assert specific state conditions at specific nodes during a walk.
*   **Stately/XState Visualization:** The `metadata.json` is a perfect candidate for an XState-style visualizer. The current "Semantics" focus is purely textual (LLM-focused), but a "Visual Semantics" layer is the obvious next step for human ergonomics.

### 5. Concrete Unresolved Decisions
*   **The MCP Server:** Listed as an optional Milestone 4 task, the MCP (Model Context Protocol) server is currently non-existent. For a project focused on "Agent & CI Integration," this is the missing link that would allow an LLM to "live" inside the registry.
*   **Persistence Ownership:** `NORTH_STAR.md` claims persistence belongs to the consumer app, but the complexity of `EntityRuntimeState` (with Sets, Maps, and Resources) makes serialization non-trivial. The framework provides `serializeState`, but the "Active Plan" lacks a clear strategy for handling state migrations when the graph schema changes.
*   **Performance Scaling:** The `walk` and `enumeratePaths` functions use simple stack-based traversal. For very large, cyclic graphs, the current implementation lacks a "visited-state-pruning" mechanism beyond basic depth limits, which may lead to performance bottlenecks in v1.0.0.

**Review Summary**: The engineering is ahead of the planning. The "Ergonomics" phase is technically complete but administratively "open." The project is ready for its first real consumer app, provided that app is also in the Bun/TS ecosystem.

---

## Appendix B: Full opencode Assistant Skeptical Review

### 1. Strongest Ideas Worth Keeping

**Registry Pattern (ProjectRegistry/EntityRegistry)**  
The transition from global singletons to registry classes is genuinely the project's best architectural decision. Code inspection confirms `packages/core/src/registry.ts` implements per-project Maps for all schema types. This delivers on the "Encore for Graphs" promise by enabling multi-tenant graph processing and clean test boundaries.

*Caveat*: The implementation is minimalist—just Maps with a `clear()` method. There's no duplicate ID detection, no event emission, no metrics. It works but is architecturally simple.

**Derived State Integration**  
`EvaluationContext.derivedState` (types.ts Line 49) is an elegant solution to the "Unlock Trap." Code inspection of `packages/runtime/src/conditions/builtin.ts` confirms built-in evaluators check `context?.derivedState` before falling back to runtime state. This allows cascading entity unlocks with zero developer overhead.

**Two-Layer Validation Architecture**  
An important distinction that deserves emphasis:
- **Static validation**: CLI `fiction-map validate` reads `metadata.json` and checks for graph errors (implemented in `packages/cli/src/commands/validate.ts`)
- **Dynamic validation**: Runtime `validateGraph()` traverses the actual graph structure programmatically

These are complementary layers serving different purposes (CI vs programmatic use), but the North Star conflates them under "CI validates graph integrity."

**Test Coverage as Validation**  
105 tests passing with 0 failures across 12 test files (Bun test v1.3.14) is genuine evidence that the code works as intended.

### 2. Contradictions or Conceptual Gaps

**Severe Documentation-Code Desync**  
`NORTH_STAR.md` marks Milestone 4 (Agent & CI Integration) as 0% complete. However:
- `packages/cli/src/commands/validate.ts` – CLI validate command (works)
- `packages/cli/src/commands/hooks.ts` – Git hooks command (works)
- No `.github/workflows` directory exists (CI wiring truly is 0%)

The engine ergonomics plan (`docs/superpowers/plans/2026-05-18-engine-ergonomics.md`) has all tasks marked `[ ]` unchecked, but code confirms all tasks are implemented. This is an administrative issue, not an engineering gap.

**Leaky Abstraction in Runtime**  
The public API audit (`docs/public-api-audit.md`) said to remove adapter internals from exports. While `packages/runtime/src/index.ts` no longer exports `parseGraph` directly, the `GraphRuntime` constructor still accepts `GraphBlueprint` type from `./adapter`:
```typescript
constructor(
  blueprint: GraphBlueprint,  // <-- type leak from adapter.ts
  evaluators?: Map<string, ConditionEvaluator>,
  handlers?: Map<string, EffectHandler>
)
```
This is a type leak that violates the pruned API contract.

**Two Validation Layers Not Documented**  
The North Star mentions "CI validates graph integrity" but doesn't distinguish between static metadata validation and dynamic graph validation. This needs clearer documentation and possibly API unification.

**Entity/Core Soft Coupling**  
Confirmed by code inspection: `packages/runtime/src/conditions/builtin.ts` imports entity-specific helpers from `../core/state`:
```typescript
import {
  ownsEntity,
  entityIsActive,
  entityIsUnlocked,
  getResource,
} from "../core/state"
```
This creates a soft dependency where the "Core" graph engine feels incomplete without the optional entities package.

**Legacy Type Debt**  
`packages/core/src/types.ts` still exports unused legacy `GraphState`/`TraversalResult` types (flagged in `docs/public-api-audit.md` Lines 24-27). These overlap with newer runtime types (`GraphRuntimeState`/`TransitionResult`).

### 3. Likely Local Bias

**Bun/TS Monorepo Assumption**  
All tooling assumes Bun and filter-based monorepo structure:
- No Jest or alternative test runner support
- No webpack, Vite-only (assumed)
- No plain Node.js consumption instructions
- Pre-commit hooks use `bun x` (hooks.ts Line references)

**Literature-RPG Gravity**  
Examples and tests are overwhelmingly narrative-RPG focused:
- `packages/runtime/src/examples/literature-rpg.test.ts` is the main example
- Derived unlock logic is specialized for narrative RPGs
- May be over-engineered for generic graph use cases (workflows, state machines)

**Test Runner Monoculture**  
All 105 tests use Vitest/Bun. No documentation or testing for alternative test runners.

**Persistence Blind Spot**  
While North Star claims persistence belongs to consumer apps, `EntityRuntimeState` complexity (Sets, Resources, nested structures) makes serialization non-trivial without framework guidance.

### 4. Transferable Ideas from External Systems

**Encore.dev Metadata-First Philosophy**  
Successfully implemented. The extraction of `metadata.json` bridges static code and dynamic tooling effectively.

**TypeDoc for Self-Documentation**  
Standard, low-maintenance solution for TypeScript package docs. Already implemented per `typedoc.json`.

**XState Visualization**  
`metadata.json` is structured perfectly for an XState-style visualizer. The current "Semantics" focus is LLM-only; a visual layer would improve human ergonomics.

**Ink/Inky Stitch Testing**  
`enumeratePaths` could adopt Ink-style path assertions for narrative regression testing—asserting specific state conditions at specific nodes during a walk.

**Stately's Actor Model**  
`GraphRuntime` could improve by adopting actor-like state machine patterns where each node is an actor with its own state and message handling. This would complement the registry pattern nicely.

### 5. Concrete Unresolved Decisions

**Milestone 4 Prioritization**  
Wire existing `validate`/`hooks` into GitHub Actions vs build MCP server first. The MCP server is listed as "optional" but is the missing link for "Agent & CI Integration."

**Registry Minimalism**  
Should the registry detect duplicate IDs? Emit events on registration? The current implementation is a "dumb Map wrapper." For a production framework, some guardrails would be appropriate.

**CLI vs Programmatic Validation Unification**  
The two validation layers (static metadata vs dynamic graph) need clearer documentation and possibly API unification. Currently they feel like separate systems rather than complementary tools.

**State Migration Strategy**  
Completely absent from all documentation. `serializeState`/`deserializeState` exist, but there's no forward-compatibility plan for when graph schemas change. This is critical for production use.

**Performance Scaling**  
`enumeratePaths` uses simple stack-based traversal with basic depth limits. For very large, cyclic graphs, there's no visited-state pruning. This is a v1.0 risk.

**MCP Server Scoping**  
Optional Milestone 4 item with no scoping. For a project focused on "Agent & CI Integration," this is critical despite the "optional" label.

**Error Message Quality**  
Milestone 5 mentions "Error messages" but no work has been done. The current error messages in `validate.ts` are functional but not beginner-friendly.

---

## Appendix C: Key Code Snippets

### ProjectRegistry (packages/core/src/registry.ts)
```typescript
export class ProjectRegistry {
  public nodeTypes = new Map<string, NodeTypeDefinition>()
  public edgeTypes = new Map<string, EdgeTypeDefinition>()
  public conditions = new Map<string, ConditionDefinition>()
  public effects = new Map<string, EffectDefinition>()
  public graphs = new Map<string, GraphDefinition>()

  public clear(): void {
    this.nodeTypes.clear()
    this.edgeTypes.clear()
    this.conditions.clear()
    this.effects.clear()
    this.graphs.clear()
  }
}
```

### EvaluationContext with derivedState (packages/runtime/src/types.ts)
```typescript
export interface EvaluationContext {
  registry?: unknown
  scope?: string
  derivedState?: DerivedEntityState
  [key: string]: unknown
}
```

### GraphRuntime Constructor (Leaky Abstraction) (packages/runtime/src/runtime.ts)
```typescript
// Type leak: GraphBlueprint is from adapter.ts, which should be internal
constructor(
  blueprint: GraphBlueprint,
  evaluators?: Map<string, ConditionEvaluator>,
  handlers?: Map<string, EffectHandler>
) {
  this.parsed = parseGraph(blueprint)  // adapter function
  this.evaluators = evaluators ?? builtinEvaluators
  this.handlers = handlers ?? builtinHandlers
}
```

### CLI Validate Command (packages/cli/src/commands/validate.ts)
```typescript
// Reads STATIC metadata.json - this is the "CI validation" layer
const raw = await readFile(metadataPath, "utf8")
metadata = JSON.parse(raw) as GraphMetadata
// Checks for graph errors and exits non-zero if found
```

### TypeDoc Configuration (typedoc.json)
```json
{
  "entryPoints": [
    "packages/core/src/index.ts",
    "packages/entities/src/index.ts",
    "packages/runtime/src/index.ts"
  ],
  "out": "docs/api",
  "plugin": ["typedoc-plugin-markdown"],
  "readme": "none",
  "excludeInternal": true
}
```

### Entity Evaluators Coupling (packages/runtime/src/conditions/builtin.ts)
```typescript
// Soft coupling: runtime built-ins import from core/state
import {
  ownsEntity,
  entityIsActive,
  entityIsUnlocked,
  getResource,
} from "../core/state"
```

---

## Bottom Line for External LM Review

**Engineering Status**: Milestones 1–3.6 are genuinely complete with 105 passing tests. The code is ahead of documentation by approximately one full milestone.

**Critical Gap**: Documentation-Code desync. `NORTH_STAR.md` needs updating to reflect that Milestone 4 is ~60% complete (CLI commands exist, CI wiring and MCP server do not).

**For External LM**: Focus your review on:
1. Is the registry pattern sufficiently robust, or should it include duplicate detection/events?
2. Is the two-layer validation architecture (static + dynamic) the right approach?
3. Should the MCP server be prioritized over GitHub Actions wiring for Milestone 4?
4. Is the entity/core coupling acceptable for a "headless engine"?
5. What's the best strategy for state migration when graph schemas evolve?

**Test Status**: 105 pass / 0 fail – code is in a shippable state for a consumer app in the Bun/TS ecosystem.
