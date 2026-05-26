# Consumer Friction Log

Findings from building the literature-rpg reference consumer against the published package surface of `@fiction-map/core`, `@fiction-map/entities`, `@fiction-map/runtime`, and `fiction-map` (CLI).

Each item lists what a real consumer hits, the workaround used in this app, and the suggested fix. Items are ordered by severity for the consumer experience.

---

## 1. Two-layer schema duplication — same graph expressed twice

**Severity:** high. This is the biggest API friction.

`defineGraph` (from `@fiction-map/core`) takes `{ nodes: NodeInstance[], edges: EdgeInstance[] }` shaped for the static metadata layer. `GraphRuntime` (from `@fiction-map/runtime`) takes a `GraphBlueprint` shaped for the runtime layer with different field names and a different way of expressing conditions/effects.

There is no public adapter that lets a consumer write the graph once and feed it to both. So the same three scenes and two edges appear in [src/graphs/story.graph.ts](src/graphs/story.graph.ts) and again in [src/main.ts](src/main.ts).

**Workaround:** duplicate the graph and add a NOTE comment in both files.

**Fix:** expose a single graph shape (or a `loadFromMetadata(metadata)` helper that builds a `GraphRuntime` from `metadata.json`). This is the natural Encore-style flow — generate writes metadata, runtime reads metadata — and the framework should ship the seam.

## 2. ~~CLI binary has no shebang~~ ✅ FIXED

Resolved by adding `#!/usr/bin/env node` to
`packages/cli/src/cli.ts`, which tsup preserves in the built CLI entrypoint.
`./node_modules/.bin/fiction-map` now executes as a program instead of being
misread by the shell as a plain script.

## 3. ~~`bun x fiction-map` fails silently~~ ✅ FIXED

Resolved by building the CLI for the Node runtime and leaving `typescript`
external instead of bundling it into the ESM entrypoint. After that change:

```bash
$ bun x fiction-map --version
fiction-map v0.1.0
```

and

```bash
$ bun x fiction-map generate --root-dir src --check
✅ Generated artifacts are up to date.
```

## 4. Packages must be built before consumer apps work

**Severity:** medium. Affects every new contributor and CI run.

The packages publish `./dist/*` only (`exports: { ".": { "import": "./dist/index.js" } }`). If `dist/` is stale (e.g., a new export was added to `src/index.ts` but the package wasn't rebuilt), the consumer gets `TypeError: registerBuiltins is not a function` instead of a clear error.

**Workaround:** `bun run build` at repo root before running this app.

**Fix:** one of —
- add a `prepare`/`postinstall` build step at root so workspace consumers always see fresh dist
- expose `src/index.ts` directly via conditional exports for workspace dev (e.g. `"./*": { "amp-dev": "./src/*", "default": "./dist/*" }`)
- ship publishConfig with a `prepublishOnly` build and rely on real npm installs for non-monorepo consumers

## 5. ~~`fiction-map validate` rejects built-in runtime condition types~~ ✅ FIXED

Resolved in the framework by teaching the generator/validator to seed the
registry with the runtime built-in catalogue during graph validation. That
makes `hasEntity` and the other built-ins valid in metadata-driven checks
without requiring every consumer app to re-declare them.

The underlying architectural concern still stands: static validation only
knows about whatever is present on the registry the generator discovers. A
future framework improvement could make that less implicit.

## 6. ~~`GraphRuntime` constructor leaks `GraphBlueprint` type~~ ✅ FIXED

Resolved as part of Milestone 3.7.b. `GraphBlueprint`, `NodeBlueprint`, and `EdgeBlueprint` are now re-exported from `@fiction-map/runtime`. This app still describes the shape inline for brevity, but consumers can now type their blueprint explicitly:

```ts
import { GraphRuntime, type GraphBlueprint } from "@fiction-map/runtime";

const blueprint: GraphBlueprint = { startNode: "...", nodes: [...], edges: [...] };
const runtime = new GraphRuntime(blueprint);
```

## 7. Package naming inconsistency vs the North Star

**Severity:** low (docs lie).

- North Star refers to `@fiction-map/cli`; the actual package is `fiction-map` (unscoped, because the bin name is `fiction-map`).
- The runtime directory is `packages/story-runtime/` but the package is `@fiction-map/runtime`. Confusing for contributors browsing the tree.

**Fix:** either rename the directory to `packages/runtime/` to match the package name, or update the North Star snippet to say `fiction-map` for the CLI. Pick one source of truth.

## 8. Generator output path defaults are confusing

**Severity:** low.

`fiction-map generate --root-dir src` writes to `src/.fiction-map/metadata.json` and `src/SEMANTICS.md`. A consumer typically wants metadata at the project root, not inside `src/`.

**Workaround:** pass `--output-dir .` explicitly when desired. Not used here because the docs site might want it under `src/`.

**Fix:** when `--root-dir` is set but `--output-dir` is not, default `--output-dir` to the project root (parent of `--root-dir`) or to cwd.

## 9. `import.meta.main` requires a cast under tsc

**Severity:** trivial.

Bun's `import.meta.main` is not in the standard `ImportMeta` lib type. Consumers using `bun run src/main.ts` as an entry point need to cast or add `@types/bun`. This app casts inline.

**Fix:** suggest adding `@types/bun` in the consumer-usage guide, or recommend an explicit entry pattern instead of `import.meta.main`.

## 10. `GraphRuntime.walk()` is too static for derived-state-driven traversal

**Severity:** low. Not a blocker, but it weakens the highest-level runtime ergonomics.

This app uses a manual `getByAvailability()` + `step()` loop in
[src/main.ts](src/main.ts) instead of `GraphRuntime.walk()`. The reason is
that derived state must be recomputed after each transition:

- take a step
- derive entity state from the new runtime state
- evaluate the next available transitions against that fresh derived state

`GraphRuntime.walk()` currently accepts one static context object for the whole
walk, which does not fit this pattern cleanly.

**Workaround:** use an explicit loop for any consumer flow where transition
availability depends on derived state that changes during traversal.

**Fix:** either document `walk()` as a low-level primitive, or add a higher-level
helper such as `walkWithContext(state, makeContext)` or `walkDerived(world, state)`
that recomputes context between steps.

---

## What worked well

- Single shared registry pattern (`EntityRegistry` extends `ProjectRegistry`) is clean — one import, all types register against it.
- File discovery glob convention (`*.node.ts`, `*.edge.ts`, `*.graph.ts`) is intuitive.
- `defineNodeType` / `defineEdgeType` / `defineGraph` ergonomics are good — clear, typed, no surprises.
- `EntityRegistry` + `defineWorld` + `deriveEntityState` flow is genuinely elegant once you understand it.
- Runtime `step` + `getByAvailability` API is small and obvious.
- Generated `metadata.json` and `SEMANTICS.md` are well-structured and immediately useful.
