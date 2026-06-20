# Agent Instructions

Welcome to the `fiction-map` repository. As an AI agent working in this codebase, you must adhere strictly to the following rules to maintain the architectural integrity, performance, and modern standards of this project.

## 1. Web Application Frameworks (NO NEXT.JS)
*   **NEVER default to Next.js.**
*   The `fiction-map` framework is a headless, highly performant client-side engine. Defaulting to heavy, bloated SSR frameworks like Next.js introduces unnecessary technical debt and defeats the purpose of the architecture.
*   **Default Stack:** Use **Vite + React + Tailwind v4 + Shadcn UI** for any web-based consumer apps or tools unless explicitly instructed otherwise by the user.

## 2. Problem Solving & Tooling (NO LAZY DOWNGRADES)
*   **NEVER downgrade major versions or use deprecated fallbacks.** If you encounter a configuration issue or build error with a modern tool (e.g., Tailwind v4, latest Shadcn CLI), you must **solve the root cause of the problem** by consulting the latest documentation or logs.
*   Rolling back to older versions (e.g., falling back to Tailwind v3 to dodge a v4 Vite config issue) is unacceptable, lazy, and introduces technical debt.
*   Always utilize the latest standard tooling (e.g., `bunx shadcn@latest`).

## 3. Architecture Boundary
*   **The Engine is Headless:** The packages (`@fiction-map/core`, `@fiction-map/entities`, `@fiction-map/runtime`) own the logic, schemas, and state derivation. They **do not** own the UI.
*   **The Consumer App owns the UI:** Consumer applications (like `apps/literature-rpg` and `apps/literature-rpg-web`) are completely responsible for styling, rendering, and gameplay loops. Keep engine concerns completely separated from the UI logic.
*   **Singletons are Banned:** Always use `ProjectRegistry` or `EntityRegistry` instances. Do not rely on global mutable state for schema definitions.

## 4. LLM-Friendly Artifacts (SINGLE SOURCE OF TRUTH > GENERATION)
*   The goal is a **single source of truth + agent-legible artifacts**; generation is a *means*, not the goal.
*   **Generate** a structured artifact only when **(a)** the content is per-consumer/authored/dynamic (e.g. graphs → `metadata.json` + `SEMANTICS.md`), **or (b)** it crosses a language/process boundary where divergence fails silently at runtime.
*   **Cross-language contracts** (e.g. the `Frame`/`Intent` presentation protocol) must be **schema-as-source-of-truth with generated bindings** for each language, pinned by a golden-fixture conformance test. Do **not** hand-port a code-first type across languages and trust an LLM to keep copies in sync — that is the drift trap.
*   **Stable, single-language, in-process types** use annotations (`@description` / `@ai-rule`) + tests — **not** a bespoke extractor.
*   **Enforcement**: These rules are deterministically enforced by our CI pipeline and architecture conformance tests (see `packages/protocol/src/conformance.test.ts`), which assert that no hand-written `Frame` or `Intent` type declarations exist outside of `generated/` directories, and that all generated files carry the appropriate DO-NOT-EDIT banners.
*   See [ADR 2026-06-20: LLM-Friendly Artifact Strategy](docs/decisions/2026-06-20-llm-friendly-artifact-strategy.md).

## 5. Git Workflow (PRS ONLY)
*   **NEVER push directly to `main`.**
*   All changes must be made on a new branch (e.g., `feature/xyz`, `fix/abc`, `docs/123`).
*   When work is complete, push the branch and use the `gh` CLI to create a Pull Request.
*   Always provide the user with the PR link when finished.