# Tale Weaver Stats — LLM Guardrails & Generator Patterns

> **Focus:** Deterministic patterns for constraining LLM-generated code, modeled after Encore's generator approach.

---

## Overview

Tale Weaver Stats implements a sophisticated system of **generators, AST enforcement, and schema-driven contracts** that together provide deterministic guardrails for LLM-generated code. This is the "Encore-style" pattern where:

1. **Code is generated from canonical definitions** (not hand-written)
2. **Schemas constrain what LLMs can produce** (not free-form)
3. **AST rules enforce patterns at commit time** (not at review time)
4. **Generated semantics provide LLM context** (not scattered documentation)

---

## 1. Generator Infrastructure

### Graph Registry Generator

**Source:** `scripts/generate-graph-registry.ts`

Auto-discovers node types, edge types, and annotation types from file conventions:

```
*.node-type.ts      → {camelCase}NodeType
*.edge-type.ts      → {camelCase}EdgeType  
*.annotation-type.ts → {camelCase}AnnotationType
```

**Outputs:**
- `src/registry.generated.ts` — TypeScript registry with all type definitions
- `GRAPH_SEMANTICS.md` — Machine-readable XML documentation for LLMs

**Key pattern:** Convention over configuration. Files follow naming patterns; generators discover and aggregate.

```typescript
// Generated output structure
export const taleWeaverRegistry = buildRegistry({
  nodeTypes: [sceneNodeType, worldEntityNodeType, ...],
  edgeTypes: [worldRelationshipEdgeType, ...],
  annotationTypes: [highlightAnnotationType, ...],
  products: [taleWeaverProduct],
});
```

### Route Generator

**Source:** `scripts/generate-product-routes.ts`

Auto-discovers routes from:
1. **Manifest routes** — `src/product-ui/*.ts` files with `routes` exports
2. **Manual routes** — `src/routing/routes.manual.ts` for non-graph-backed routes

**Outputs:**
- `routes.generated.ts` — Route catalog with full type information
- `route-helpers.generated.ts` — Type-safe URL builders
- `ROUTE_SEMANTICS.md` — Machine-readable route contracts

**Key pattern:** Routes are discovered, not declared. The manifest defines resource/view pairs; generators derive routes.

```typescript
// Generated URL builder
export function buildTaleWeaverUrl(
  routeId: TaleWeaverRouteId,
  params?: Record<string, string>
): string;
```

### JSDoc Extraction

**Source:** `scripts/lib/graph-jsdoc-extractor.ts`

Extracts structured documentation from source files using TypeScript AST:

- `@description` — Human-readable description
- `@ai-rule` — Machine-readable constraint for LLMs

```typescript
// Source file
/**
 * @description A scene in the story graph
 * @ai-rule Scenes must have prose content or be marked as endings
 */
export const sceneNodeType = defineNodeType({...});
```

Generated `GRAPH_SEMANTICS.md`:
```xml
<node_type id="scene">
  <description>A scene in the story graph</description>
  <ai_rule>Scenes must have prose content or be marked as endings</ai_rule>
  <properties>
    <property name="sceneKey" type="string" required="true" />
    <property name="title" type="string" required="false" />
  </properties>
</node_type>
```

---

## 2. Schema-Driven Contracts

### Zod Schemas as Deterministic Boundaries

**Location:** `packages/contracts/src/`

All API boundaries use Zod schemas that constrain both:
1. **What can be stored** (schema validation)
2. **What LLMs can generate** (schema constraints)

**Example: Choice Contract**

```typescript
// packages/contracts/src/choice.contract.ts

export const ConditionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stat"), stat: z.string().min(1), comparison: z.enum(["gte", "lte", "eq"]), value: z.number() }),
  z.object({ type: z.literal("resource"), resource: z.string().min(1), comparison: z.enum(["gte", "lte", "eq"]), value: z.number() }),
  z.object({ type: z.literal("has-item"), item: z.string().min(1) }),
  z.object({ type: z.literal("has-trait"), trait: z.string().min(1) }),
  z.object({ type: z.literal("flag"), scope: z.enum(["global", "scene"]), key: z.string().min(1), value: z.union([z.boolean(), z.string(), z.number()]) }),
  z.object({ type: z.literal("quest-stage"), questId: z.string().min(1), comparison: z.enum(["gte", "lte", "eq"]), value: z.number() }),
  z.object({ type: z.literal("action-used"), scope: z.enum(["scene", "global"]), actionId: z.string().min(1) }),
]);

export const EffectSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("stat"), stat: z.string().min(1), delta: z.number() }),
  z.object({ type: z.literal("resource"), resource: z.string().min(1), delta: z.number() }),
  z.object({ type: z.literal("add-item"), item: z.string().min(1) }),
  z.object({ type: z.literal("remove-item"), item: z.string().min(1) }),
  // ... more types
]);
```

**Key patterns:**
- **Discriminated unions** — Type-safe variants with `type` field
- **`.min(1)` on strings** — Prevents empty strings
- **Fixed enums** — Not arbitrary strings (e.g., `z.enum(["gte", "lte", "eq"])`)
- **Refinements** — Custom validation rules (e.g., "at least one condition group required")

### Form Schema Derivation

**Location:** `apps/frontend/src/forms/primitives/primitiveFormSchemas.ts`

Form schemas derive from the same Zod types used in contracts:

```typescript
export const characterRoleSchema = z.enum([
  "player", "npc", "companion", "antagonist", "narrator", "minor"
]);

export const characterPrimitiveFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or fewer"),
  role: characterRoleSchema,
  pronouns: z.string().max(100).optional(),
  tags: z.string().max(200).optional(),
});
```

---

## 3. AST-Grep Enforcement

### Rule Categories

**Location:** `packages/config/rules/`

| Category | Count | Purpose |
|----------|-------|---------|
| `ai-coding-standards/` | 24 | LLM-specific constraints |
| `package-conformance/` | 12 | Import boundary enforcement |
| `react-best-practices/` | 12 | React patterns |
| `service-conformance/` | 2 | Route/service patterns |
| `component-architecture/` | 4 | UI composition rules |
| `react-native-practices/` | 3 | Mobile-specific rules |

**Total: 67 AST-grep rules** enforcing deterministic patterns.

### Key Enforcement Rules

#### Input Validation in Routes

```yaml
# packages/config/rules/ai-coding-standards/validate-input-in-routes.yml
id: validate-input-in-routes
severity: error
message: "Route handlers must validate input with Zod safeParse before using body/params"
rule:
  any:
    - pattern: const $VAR = await c.req.json();
    - pattern: const $VAR = await c.req.json<$TYPE>();
    - pattern: const $VAR = parseInt(c.req.param($NAME), $RADIX);
```

**Effect:** LLMs cannot write routes that bypass schema validation. The pattern `c.req.json()` is blocked; they must use `Schema.safeParse()`.

#### No `any` in Contracts

```yaml
# packages/config/rules/ai-coding-standards/no-any-in-contracts.yml
id: no-any-in-contracts
severity: error
message: "Contracts must not use 'any' type"
files:
  - "packages/contracts/src/**/*.ts"
```

#### Package Boundary Enforcement

```yaml
# packages/config/rules/package-conformance/no-product-imports-in-capability-packages.yml
id: no-product-imports-in-capability-packages
message: "Capability packages must not import from product packages"
files:
  - "packages/capability-*/src/**/*.ts"
```

**Effect:** Enforces layering — capabilities are below products, not vice versa.

### Pre-Commit Enforcement

**Location:** `scripts/checks/pre-commit.sh`

```bash
echo "🔎 Running lint:ai (ast-grep)..."
bun run lint:ai
```

Generators run and are checked for drift:
- `make graph-registry-generate`
- `make product-routes-generate`
- `make component-registry`

---

## 4. Capability Framework

### Purpose

A **policy resolution layer** that answers:
- "Can this capability exist for this project/story/product?"
- "Can this surface render?"
- "Can this backend operation execute?"
- "Why is it blocked?" and "Which provider decided that?"

**Not just feature flags** — a broader entitlement/policy system.

### Core Types

**Location:** `packages/capability-core/src/capability-core.ts`

```typescript
interface CapabilityDefinition<TCapabilityId extends string = string> {
  id: TCapabilityId;
  label: string;
  description?: string;
  dependsOn?: TCapabilityId[];  // Dependency-aware resolution
  metadata?: Record<string, unknown>;
}

interface CapabilityProvider<TContext = unknown> {
  id: string;
  resolveCapability: (
    capabilityId: string,
    context: TContext,
  ) => CapabilityProviderResult | Promise<CapabilityProviderResult>;
}

interface CapabilityResolution {
  capabilityId: string;
  available: boolean;
  reasons: CapabilityBlockedReason[];
  providerResults: CapabilityProviderTrace[];  // Explainability
}
```

### Provider Composition

Multiple providers contribute signals:

1. **Story style provider** — Capabilities enabled by story type
2. **Feature flag provider** — Rollout controls
3. **RBAC provider** (planned) — Role-based access
4. **Entitlement provider** (planned) — Subscription/plan limits

**Resolution merges all signals** with full traceability.

### Product Registries

Each product defines its own registry:

```typescript
// packages/capability-tale-weaver/src/tale-weaver-capabilities.ts
export const taleWeaverCapabilityRegistry = defineCapabilityRegistry({
  capabilities: {
    "branching-choices": { id: "branching-choices", label: "Branching Choices" },
    "inline-actions": { id: "inline-actions", label: "Inline Actions", dependsOn: ["effects"] },
    "character-sheet": { id: "character-sheet", label: "Character Sheet" },
    "stats": { id: "stats", label: "Stats" },
    // ...
  },
  surfaces: {
    "scene-editor": { id: "scene-editor", requirement: "all", capabilities: ["scenes", "branching-choices"] },
    "world-editor-tool": { id: "world-editor-tool", requirement: "any", capabilities: ["stats", "resources", "items", "traits"] },
  },
  operations: {
    "story.scene.reorder": { id: "story.scene.reorder", requirement: "all", capabilities: ["scenes"] },
    "story.referenceTags.resolve": { id: "story.referenceTags.resolve", requirement: "all", capabilities: ["reference-tags"] },
  },
});
```

---

## 5. Pure Domain Functions

### Design Philosophy

**Location:** `packages/domain/src/`

All domain logic is:
- **Pure functions** — No I/O, no side effects
- **Deterministic** — Same inputs → same outputs
- **Reusable** — Frontend, backend, and static publisher all use the same code

### Example: Apply Choice

```typescript
// packages/domain/src/apply-choice.ts

export function applyChoice(
  currentState: GameState,
  choice: SceneChoice,
  primitives?: PrimitiveDefinitions
): InteractionResult {
  const nextState = cloneState(currentState);
  appendChoiceSelection(nextState, choice.id);

  const availability = canMakeChoice(choice, nextState, primitives);
  const success = availability.allowed;
  const effects = success ? choice.effects : choice.failureEffects;
  const nextScene = success ? choice.nextScene : choice.failureNextScene;

  const consequence = applyEffects(nextState, effects, primitives);

  if (nextScene) {
    navigate(nextState, nextScene);
  }

  return {
    state: nextState,
    consequence,
    shouldNavigate: Boolean(nextScene),
    nextScene,
    success,
  };
}
```

**Key pattern:** State is cloned, never mutated. Returns explicit `InteractionResult` with traceability.

### Graph Validation

```typescript
// packages/domain/src/validate-graph.ts

export type GraphErrorType =
  | "dangling_choice"      // Choice points to non-existent scene
  | "unreachable_scene"    // Scene not reachable from start
  | "orphan_scene"         // Scene has no connections
  | "empty_choices"        // Scene has no choices and isn't ending
  | "missing_prose";       // Scene has no content

export function validateGraph(
  graph: StoryGraph,
  startSceneKey: string
): ValidateGraphResult {
  // BFS traversal with validation
  // Returns: { valid, errors, reachableScenes }
}
```

---

## 6. Static Publisher Bundle Generation

### Layered Module System

**Location:** `packages/static-publisher/`

Runtime modules selected based on enabled features:

```
CORE RUNTIME (~20KB) — Always included
  ├── Scenes, choices, navigation
  └── State persistence

PRIMITIVES MODULE (~10KB) — stats, resources, items, traits
LOGIC MODULE (~5KB) — conditions, effects, flags
CHARACTER MODULE (~5KB) — character sheet UI
ABILITIES MODULE (~5KB) — ability system
ACTIONS MODULE (~5KB) — inline actions
```

### Module Selection at Publish Time

```typescript
function selectRuntimeModules(features: StoryFeature[]): RuntimeModule[] {
  const modules = [CORE_RUNTIME];

  if (hasPrimitives(features)) modules.push(PRIMITIVES_MODULE);
  if (hasLogic(features)) modules.push(LOGIC_MODULE);
  if (features.includes('character-sheet')) modules.push(CHARACTER_MODULE);
  // ... dependency-aware selection

  return modules;
}
```

### RuntimeExtension Interface

Deterministic extension points for future features:

```typescript
interface RuntimeExtension {
  id: string;
  provides: StoryFeature[];
  requires?: StoryFeature[];

  effectHandlers?: Map<EffectType, EffectHandler>;
  conditionEvaluators?: Map<ConditionType, ConditionEvaluator>;
  panels?: PanelDefinition[];

  init?: (runtime: RuntimeContext) => void;
  destroy?: () => void;
}
```

---

## 7. Reusable Patterns for Other Projects

### Pattern 1: Generator-First Architecture

**What:** Code is generated from canonical definitions, not hand-written.

**How:**
1. Define file naming conventions (`*.node-type.ts`)
2. Write generator that discovers files
3. Generate TypeScript code + machine-readable docs
4. Commit generated files (drift detection in CI)

**Benefits:**
- Single source of truth
- LLM context is always in sync with code
- Changes propagate automatically

### Pattern 2: Schema-As-Contract

**What:** Zod schemas define the boundary between LLM output and application code.

**How:**
1. Define all types as Zod schemas in `contracts/` package
2. Use discriminated unions for variants
3. Enforce `safeParse()` at all API boundaries
4. AST-grep rule blocks bypass patterns

**Benefits:**
- LLMs constrained to valid shapes
- Type safety end-to-end
- Runtime validation matches compile-time types

### Pattern 3: AST-Enforced Patterns

**What:** Structural patterns enforced at commit time, not review time.

**How:**
1. Identify patterns LLMs frequently get wrong
2. Write ast-grep rules matching anti-patterns
3. Add to pre-commit hooks
4. Generate docs from rules for LLM context

**Benefits:**
- Immediate feedback
- Consistent codebase
- LLMs learn from error messages

### Pattern 4: Pure Domain Functions

**What:** All business logic is pure, testable, and reusable.

**How:**
1. Separate `domain/` package with no I/O
2. Clone state, never mutate
3. Return explicit result types with traceability
4. Validate inputs with schemas

**Benefits:**
- Testable without mocks
- Reusable in frontend/backend/static
- Deterministic for debugging

### Pattern 5: Capability Resolution

**What:** Policy decisions through provider composition, not ad hoc checks.

**How:**
1. Define capabilities, surfaces, operations
2. Register providers (feature flags, RBAC, entitlements)
3. Resolve through framework, not scattered `if` checks
4. Return traceability with every decision

**Benefits:**
- Explainable decisions
- Testable policy
- Single vocabulary

---

## 8. Key Files Reference

| Pattern | File Path |
|---------|-----------|
| Graph Registry Generator | `scripts/generate-graph-registry.ts` |
| Route Generator | `scripts/generate-product-routes.ts` |
| JSDoc Extractor | `scripts/lib/graph-jsdoc-extractor.ts` |
| Choice Contract | `packages/contracts/src/choice.contract.ts` |
| AST-Grep Rules | `packages/config/rules/**/*.yml` |
| Capability Core | `packages/capability-core/src/capability-core.ts` |
| Apply Choice | `packages/domain/src/apply-choice.ts` |
| Validate Graph | `packages/domain/src/validate-graph.ts` |
| Static Publisher Plan | `docs/plans/static-publisher.md` |
| Capability Framework Plan | `docs/plans/generic-capability-framework.md` |
