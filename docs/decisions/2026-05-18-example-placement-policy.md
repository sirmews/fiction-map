# Decision: Example Placement Policy

**Date:** 2026-05-18

## Context

During the development of the headless engine foundation, we created a `literature-rpg.test.ts` example to prove that the core, entities, and runtime packages could work together to form a cohesive system. 

As we move towards consumer app readiness, we need a clear policy on where future examples should live. Should they remain as tests, be extracted into shared JSON fixtures, become documentation-only snippets, or form a completely new `packages/example-app` workspace?

## Decision

**We will keep framework examples as executable tests within the relevant packages (e.g., `src/examples/*.test.ts`).**

We will *not* create a standalone example app scaffold, nor will we move examples to a dedicated `packages/examples` directory at this stage.

## Rationale

1. **Guaranteed Accuracy:** Executable tests are verified continuously by CI (`bun test`). If an API boundary changes, the example breaks and must be fixed. Documentation-only snippets often rot.
2. **Zero Infrastructure Overhead:** We already have Vitest set up in every package. Creating a standalone app scaffold requires bundlers (Vite/Next), UI decisions, and extra workspace maintenance. That violates our current mandate to focus on the headless engine, not a consumer UI.
3. **Living Documentation:** The `Consumer Usage Guide` successfully references the `.test.ts` file as its grounding scenario. This proves that a well-written test can serve as both proof-of-correctness and reference material.

## Implications for Future Agents

*   **When adding a new domain example:** Create a new test file in `packages/<package>/src/examples/<domain>.test.ts`.
*   **When writing documentation:** Link directly to the relevant `src/examples/*.test.ts` file. Do not duplicate massive blocks of JSON/TypeScript in the markdown if it can be avoided.
*   **When asked to create an example app:** Refuse and cite this decision, unless the active plan (`docs/plans/`) explicitly overrides this and tasks you with creating a consumer app scaffold.
