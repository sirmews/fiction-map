# Story Runtime — Design Document

> A schema-driven runtime engine for graph-based narratives, workflows, and decision trees. Built on GraphCore, visualization-agnostic.

---

## Motivation

React Flow provides visualization. GraphCore provides schema definitions. What's missing is the **execution layer** — the behavior mechanics that make nodes "do something" when you interact with them.

This package extracts the reusable patterns from Tale Weaver's `@tale-weaver/domain` into a generic, pluggable runtime that can power:

- Story/narrative games (branching choices, conditions, effects)
- Workflow engines (decision trees, state machines)
- Game editors (playtest, simulate state)
- Knowledge graph traversal

---

## Core Principles

1. **Visualization-agnostic** — No React, no DOM. Pure TypeScript.
2. **Schema-driven** — Node/edge behavior derived from GraphCore definitions.
3. **Pluggable mechanics** — Conditions and effects are extensible, not hardcoded.
4. **Immutable state** — State transitions return new state, never mutate.
5. **Traceable results** — Every transition returns `TransitionResult` with consequence + trace.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        story-runtime                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │    State     │───▶│  Transition  │───▶│ TransitionResult │   │
│  │  Management  │    │   Engine     │    │   (traceable)    │   │
│  └──────────────┘    └──────────────┘    └──────────────────┘   │
│         │                   │                                    │
│         │            ┌──────┴──────┐                            │
│         │            │             │                            │
│         ▼            ▼             ▼                            │
│  ┌──────────────┐ ┌─────────────┐ ┌──────────────┐              │
│  │  Evaluators  │ │   Handlers  │ │  Validation  │              │
│  │ (conditions) │ │  (effects)  │ │   (graph)    │              │
│  └──────────────┘ └─────────────┘ └──────────────┘              │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                        graph-core                                │
│                   (Schema definitions)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Types

### Runtime State

```typescript
/**
 * Immutable runtime state for a graph traversal.
 * 
 * Design: Clone on every transition. Never mutate.
 * This enables: undo/redo, branching timelines, replay, debugging.
 */
interface GraphRuntimeState {
  /** Current position in the graph */
  currentNodeId: string;
  
  /** Navigation history (for backtracking) */
  history: string[];
  
  /** Generic key-value store for domain-specific data */
  variables: Record<string, unknown>;
  
  /** Boolean/string/number flags (scene-scoped or global) */
  flags: Record<string, boolean | string | number>;
  
  /** Set of visited node IDs */
  visited: Set<string>;
  
  /** Domain-specific extensions (character sheet, inventory, etc.) */
  extensions?: Record<string, unknown>;
}
```

**Why this shape:**
- `currentNodeId` — Every graph traversal has a position
- `history` — Enables backtracking, undo, breadcrumbs
- `variables` — Generic enough for any domain (stats, form data, counters)
- `flags` — Common pattern: global flags + scene-scoped flags
- `visited` — Enables "first visit" triggers, completion tracking
- `extensions` — Escape hatch for domain-specific state without forking the library

---

### Condition System

```typescript
/**
 * Base condition shape. Domain-specific conditions extend this.
 * 
 * Design: Discriminated union on `type` field.
 * Enables: Type-safe condition definitions, pluggable evaluators.
 */
interface Condition {
  type: string;
  [key: string]: unknown;
}

/**
 * Condition set with logical composition.
 * 
 * - all: AND (all must be true)
 * - any: OR (at least one must be true)  
 * - none: NOR (none must be true)
 * 
 * Enables: Complex requirements like "has sword AND (level >= 5 OR has enchantment)"
 */
interface ConditionSet {
  all?: Condition[];
  any?: Condition[];
  none?: Condition[];
}

/**
 * Pluggable condition evaluator.
 * 
 * Each domain registers evaluators for their condition types.
 * Example: Tale Weaver registers "stat", "has-item", "flag", etc.
 */
type ConditionEvaluator = (
  state: GraphRuntimeState,
  condition: Condition,
  context?: EvaluationContext
) => boolean;

interface EvaluationContext {
  /** GraphCore registry for schema lookups */
  registry?: GraphRegistry;
  /** Current scene/node scope */
  scope?: string;
  /** Additional domain context */
  [key: string]: unknown;
}
```

---

### Effect System

```typescript
/**
 * Base effect shape. Domain-specific effects extend this.
 * 
 * Design: Discriminated union on `type` field.
 * Mirrors condition system for consistency.
 */
interface Effect {
  type: string;
  [key: string]: unknown;
}

/**
 * Pluggable effect handler.
 * 
 * Handlers receive current state and return NEW state.
 * Never mutate — always return a cloned/modified copy.
 */
type EffectHandler = (
  state: GraphRuntimeState,
  effect: Effect,
  context?: EffectContext
) => GraphRuntimeState;

interface EffectContext {
  registry?: GraphRegistry;
  scope?: string;
  [key: string]: unknown;
}
```

---

### Transition Result

```typescript
/**
 * Result of a graph transition. Always traceable.
 * 
 * Design: Return enough information to render feedback,
 * save state, and debug. Never just return "success: boolean".
 */
interface TransitionResult {
  /** New state (cloned, never mutated) */
  state: GraphRuntimeState;
  
  /** What changed (for UI feedback) */
  consequence?: Consequence;
  
  /** Should the runtime navigate to a new node? */
  shouldNavigate: boolean;
  
  /** Target node ID (if shouldNavigate is true) */
  nextNodeId?: string;
  
  /** Did the transition succeed? */
  success: boolean;
  
  /** Failure reason (if success is false) */
  failureReason?: string;
  
  /** Full trace of evaluators/handlers invoked (for debugging) */
  trace?: TransitionTrace;
}

/**
 * What happened as a result of a transition.
 * 
 * Enables: UI feedback ("You gained 5 health"), state diffing, save game summaries.
 */
interface Consequence {
  type: string;
  [key: string]: unknown;
}

interface TransitionTrace {
  conditionsEvaluated: Array<{
    condition: Condition;
    result: boolean;
    evaluator: string;
  }>;
  effectsApplied: Array<{
    effect: Effect;
    handler: string;
  }>;
}
```

---

## Core Functions

### State Management

```typescript
/**
 * Create initial state at a starting node.
 */
function createInitialState(
  startNodeId: string,
  initialVariables?: Record<string, unknown>
): GraphRuntimeState;

/**
 * Clone state (deep copy).
 * 
 * Use before any mutation. Guarantees immutability.
 */
function cloneState(state: GraphRuntimeState): GraphRuntimeState;

/**
 * Merge partial state updates.
 * 
 * Returns new state with updates applied.
 */
function mergeState(
  state: GraphRuntimeState,
  updates: Partial<GraphRuntimeState>
): GraphRuntimeState;
```

---

### Condition Evaluation

```typescript
/**
 * Evaluate a single condition.
 * 
 * Looks up evaluator by condition.type, invokes it.
 */
function evaluateCondition(
  state: GraphRuntimeState,
  condition: Condition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext
): boolean;

/**
 * Evaluate a condition set (all/any/none composition).
 */
function evaluateConditionSet(
  state: GraphRuntimeState,
  conditionSet: ConditionSet | undefined,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext
): boolean;

/**
 * Built-in evaluators (generic, not domain-specific).
 * 
 * - "equals": state.variables[key] === value
 * - "greaterThan": state.variables[key] > value
 * - "lessThan": state.variables[key] < value
 * - "hasFlag": state.flags[key] exists
 * - "visited": state.visited.has(nodeId)
 */
const builtinEvaluators: Map<string, ConditionEvaluator>;
```

---

### Effect Application

```typescript
/**
 * Apply a single effect.
 * 
 * Looks up handler by effect.type, invokes it, returns new state.
 */
function applyEffect(
  state: GraphRuntimeState,
  effect: Effect,
  handlers: Map<string, EffectHandler>,
  context?: EffectContext
): GraphRuntimeState;

/**
 * Apply multiple effects in sequence.
 */
function applyEffects(
  state: GraphRuntimeState,
  effects: Effect[],
  handlers: Map<string, EffectHandler>,
  context?: EffectContext
): GraphRuntimeState;

/**
 * Built-in handlers (generic, not domain-specific).
 * 
 * - "setVariable": state.variables[key] = value
 * - "increment": state.variables[key] += delta
 * - "setFlag": state.flags[key] = value
 * - "clearFlag": delete state.flags[key]
 * - "markVisited": state.visited.add(nodeId)
 */
const builtinHandlers: Map<string, EffectHandler>;
```

---

### Transition Engine

```typescript
/**
 * Transition definition (edge in the graph).
 * 
 * Derived from GraphCore edge types, but runtime-focused.
 */
interface Transition {
  id: string;
  sourceNodeId: string;
  targetNodeId?: string;
  
  /** Conditions that must be met to allow transition */
  requirements?: ConditionSet;
  
  /** Conditions for transition to be visible/selectable */
  visibility?: ConditionSet;
  
  /** Effects applied on successful transition */
  effects?: Effect[];
  
  /** Effects applied on failed transition */
  failureEffects?: Effect[];
  
  /** Alternative target if transition fails */
  failureTargetNodeId?: string;
}

/**
 * Check if a transition is allowed.
 */
function canTransition(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  context?: EvaluationContext
): TransitionAvailability;

interface TransitionAvailability {
  allowed: boolean;
  visible: boolean;
  reason?: string;
}

/**
 * Execute a transition.
 * 
 * 1. Check requirements
 * 2. Apply effects (success or failure)
 * 3. Navigate to target
 * 4. Return traceable result
 */
function applyTransition(
  state: GraphRuntimeState,
  transition: Transition,
  evaluators: Map<string, ConditionEvaluator>,
  handlers: Map<string, EffectHandler>,
  context?: EvaluationContext & EffectContext
): TransitionResult;
```

---

### Graph Validation

```typescript
/**
 * Validate graph integrity.
 * 
 * Checks:
 * - Dangling transitions (references non-existent nodes)
 * - Unreachable nodes (not reachable from start)
 * - Orphan nodes (no incoming or outgoing edges)
 * - Missing required properties
 */
function validateGraph(
  nodes: Map<string, NodeDefinition>,
  transitions: Transition[],
  startNodeId: string
): ValidationResult;

interface ValidationResult {
  valid: boolean;
  errors: GraphError[];
  reachableNodes: Set<string>;
}

interface GraphError {
  type: "dangling-transition" | "unreachable-node" | "orphan-node" | "missing-property";
  nodeId?: string;
  transitionId?: string;
  message: string;
}
```

---

## Registry Integration

The runtime is designed to work with GraphCore registries, but doesn't require them.

```typescript
/**
 * Derive transitions from GraphCore edge types.
 * 
 * Enables: Schema-defined transitions instead of manual wiring.
 */
function deriveTransitionsFromRegistry(
  registry: GraphRegistry,
  edgeType: string,
  context?: { sourceNodeId?: string }
): Transition[];

/**
 * Create evaluators from GraphCore node/edge schemas.
 * 
 * Enables: Schema-defined conditions (e.g., property comparisons).
 */
function createSchemaEvaluators(
  registry: GraphRegistry
): Map<string, ConditionEvaluator>;
```

---

## Package Structure

```
packages/runtime/
├── src/
│   ├── index.ts                    # Public exports
│   │
│   ├── core/
│   │   ├── state.ts                # GraphRuntimeState, clone, merge
│   │   ├── transition.ts           # canTransition, applyTransition
│   │   ├── navigation.ts           # navigate, backtrack, history
│   │   └── validation.ts           # validateGraph
│   │
│   ├── conditions/
│   │   ├── index.ts                # Condition types, evaluateCondition
│   │   ├── evaluators.ts           # ConditionEvaluator type
│   │   ├── builtin.ts              # equals, greaterThan, hasFlag, visited
│   │   └── compose.ts              # evaluateConditionSet (all/any/none)
│   │
│   ├── effects/
│   │   ├── index.ts                # Effect types, applyEffect
│   │   ├── handlers.ts             # EffectHandler type
│   │   └── builtin.ts              # setVariable, increment, setFlag
│   │
│   ├── registry/
│   │   ├── index.ts                # GraphCore integration
│   │   ├── derive-transitions.ts   # Derive from edge types
│   │   └── schema-evaluators.ts    # Create from schemas
│   │
│   └── types.ts                    # All public types
│
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## Dependencies

```json
{
  "name": "@your-org/story-runtime",
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "dependencies": {
    "zod": "^3.25.0"
  },
  "peerDependencies": {
    "@your-org/graph-core": "*"
  },
  "peerDependenciesMeta": {
    "@your-org/graph-core": {
      "optional": true
    }
  },
  "devDependencies": {
    "typescript": "^5.8.0",
    "vitest": "^3.0.0"
  }
}
```

**Key decisions:**
- `zod` required — Schema validation is core to the design
- `graph-core` optional — Can use runtime without GraphCore (just won't have schema-derived transitions)

---

## Usage Examples

### Basic Usage (without GraphCore)

```typescript
import {
  createInitialState,
  applyTransition,
  builtinEvaluators,
  builtinHandlers,
} from "@your-org/story-runtime";

// Define a transition
const choiceTransition = {
  id: "choice-1",
  sourceNodeId: "scene-1",
  targetNodeId: "scene-2",
  requirements: {
    all: [{ type: "hasFlag", key: "has-key" }]
  },
  effects: [
    { type: "setFlag", key: "opened-door" },
    { type: "markVisited", nodeId: "scene-1" }
  ]
};

// Create state
let state = createInitialState("scene-1", { gold: 10 });
state.flags["has-key"] = true;

// Execute transition
const result = applyTransition(
  state,
  choiceTransition,
  builtinEvaluators,
  builtinHandlers
);

console.log(result.success);           // true
console.log(result.nextNodeId);        // "scene-2"
console.log(result.state.visited);     // Set { "scene-1" }
```

### With Custom Mechanics

```typescript
import { builtinEvaluators, builtinHandlers, applyTransition } from "@your-org/story-runtime";

// Register domain-specific evaluators
const gameEvaluators = new Map([
  ...builtinEvaluators,
  ["stat", (state, condition) => {
    const { stat, comparison, value } = condition as StatCondition;
    const current = state.extensions?.character?.stats?.[stat] ?? 0;
    return comparison === "gte" ? current >= value : current <= value;
  }],
  ["hasItem", (state, condition) => {
    const { item } = condition as HasItemCondition;
    return (state.extensions?.inventory ?? []).includes(item);
  }]
]);

// Register domain-specific handlers
const gameHandlers = new Map([
  ...builtinHandlers,
  ["addStat", (state, effect) => {
    const { stat, delta } = effect as AddStatEffect;
    const current = state.extensions?.character?.stats?.[stat] ?? 0;
    return {
      ...state,
      extensions: {
        ...state.extensions,
        character: {
          ...state.extensions?.character,
          stats: {
            ...state.extensions?.character?.stats,
            [stat]: current + delta
          }
        }
      }
    };
  }]
]);

// Use in transition
const result = applyTransition(
  state,
  { id: "attack", effects: [{ type: "addStat", stat: "health", delta: -10 }] },
  gameEvaluators,
  gameHandlers
);
```

### With GraphCore Registry

```typescript
import { deriveTransitionsFromRegistry, createSchemaEvaluators } from "@your-org/story-runtime";

// Derive transitions from GraphCore edge definitions
const transitions = deriveTransitionsFromRegistry(
  registry,
  "choice-edge",
  { sourceNodeId: "scene-1" }
);

// Create evaluators from schema constraints
const schemaEvaluators = createSchemaEvaluators(registry);
```

---

## Comparison: Tale Weaver's domain package

| Aspect | Tale Weaver domain | story-runtime |
|--------|-------------------|---------------|
| Condition types | Hardcoded (stat, has-item, flag, quest-stage) | Pluggable via Map |
| Effect types | Hardcoded (stat delta, add-item, set-flag) | Pluggable via Map |
| State shape | Tale-specific (character, inventory, quests) | Generic (variables, flags, extensions) |
| Registry aware | No (separate from graph-core) | Optional integration |
| Domain-agnostic | No (Tale Weaver only) | Yes |

---

## Implementation Status

### Completed ✅

| Module | File | Status | Tests |
|--------|------|--------|-------|
| Core Types | `src/types.ts` | ✅ Done | — |
| State Management | `src/core/state.ts` | ✅ Done | 13 tests ✅ |
| Condition Evaluation | `src/conditions/index.ts` | ✅ Done | — |
| Built-in Evaluators | `src/conditions/builtin.ts` | ✅ Done | — |
| Effect Application | `src/effects/index.ts` | ✅ Done | — |
| Built-in Handlers | `src/effects/builtin.ts` | ✅ Done | — |
| Transition Engine | `src/core/transition.ts` | ✅ Done | 21 tests ✅ |
| Graph Validation | `src/core/validation.ts` | ✅ Done | — |
| Package Config | `package.json`, `tsconfig.json`, `vitest.config.ts` | ✅ Done | — |

**Total: 34 passing tests**

### Remaining

| Task | Priority | Notes |
|------|----------|-------|
| GraphCore Integration | Medium | `src/registry/` - derive transitions from registry |
| README.md | Medium | Usage examples, API docs |
| Migration Guide | Low | How to move from Tale Weaver's domain |

---

## Next Steps

1. ~~**Implement core types** — `types.ts`~~ ✅
2. ~~**Implement state management** — `core/state.ts`~~ ✅
3. ~~**Implement condition evaluation** — `conditions/`~~ ✅
4. ~~**Implement effect application** — `effects/`~~ ✅
5. ~~**Implement transition engine** — `core/transition.ts`~~ ✅
6. ~~**Add graph validation** — `core/validation.ts`~~ ✅
7. **Add tests** — Mirror Tale Weaver's test coverage
8. **Add GraphCore integration** — `registry/`
9. **Document migration path** — How to move from Tale Weaver's domain to story-runtime
