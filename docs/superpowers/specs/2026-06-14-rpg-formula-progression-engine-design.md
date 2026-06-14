# Design Spec: Dynamic Formula Engine with Attribute Scaling & Progression

## 1. Overview
The goal is to implement a secure, fully type-safe, and flexible **Mathematical Formula Engine** within `@fiction-map/runtime`. 

This enables narrative and trigger effects to calculate resource changes dynamically based on other resource values or global variables (e.g. scaling HP healing using `intelligence`, or setting leveling requirements based on `level` or `age`). It keeps the engine completely headless and customizable for any progression system.

## 2. Requirements & Type Safety
- **Extensible Schema**: Enhance `ResourceEffect` and `spendResource`/`addResource` handlers to support an optional string `formula` parameter alongside the traditional static `amount` parameter.
- **Strict Backwards Compatibility**: If a static `amount` is provided, evaluate it directly as before.
- **Secure Tokenizer & Math Parser**: Implement a lightweight, secure parser inside `@fiction-map/runtime/src/utils/formula.ts` that:
  - Tokenizes formula strings (e.g., `"20 + intelligence * 1.5"` or `"level * 100"`).
  - Resolves any word-based variables against the active player resources (`state.entityState?.resources`) and global variables (`state.variables`).
  - Evaluates standard arithmetic operators (`+`, `-`, `*`, `/`, parenthesis) safely, rejecting any malicious executions like `eval` or `Function`.
  - Defaults unresolved variables to `0` to prevent runtime crashes.

## 3. Tech Stack & Integration Points
- **Language**: TypeScript
- **Target Handler Modification**:
  - `packages/runtime/src/entities/effect-handlers.ts`: Update `addResourceHandler` and `spendResourceHandler` to check if a `formula` is provided, evaluate it, and pass the computed numeric result to the state mutators.
- **State Triggers Support**:
  - Because triggers leverage the same core handlers, any trigger can now declare a `formula` parameter inside its effects array out-of-the-box.

## 4. Test Strategy
- **Formula Unit Tests**: Add robust tests inside `packages/runtime/src/utils/formula.test.ts` checking:
  - Correct operator precedence (e.g. `2 + 3 * 4 === 14`, not `20`).
  - Valid resource and variable substitution.
  - Graceful handling of nested parenthesis.
  - Safe error recovery for division by zero or malformed syntax.
- **LitRPG Progression Integration Tests**: Add integration tests verifying a custom "attribute-scaling heal" spell and an "experience level-up trigger loop".
