# TypeScript runtime cutover baseline

Captured at `f0a9c7e`. From the repository root, install workspace dependencies and build core, entities, runtime, protocol, and the CLI using the Literature RPG dependency build.

```sh
bun run --cwd apps/literature-rpg build:deps
bun packages/runtime/conformance/cutover/contract.ts
bun packages/runtime/conformance/cutover/benchmark.ts
```

The contract imports the package's public entry point and the Literature RPG app's runtime and world. Rebuild the workspace packages with the candidate runtime before running the same commands. The contract compares observations to `expected.json` and directly checks JavaScript identities. `--print-observations` prints candidate behavior for diagnosis without updating the fixture.

The cases cover gameplay resources and inventory, availability diagnostics, transition and failure effect order, triggers and automatic transitions, traversal and cycle detection, static and semantic diagnostics, version 1 save loading and resumption, and synchronous callbacks with an opaque JavaScript Symbol. The callback case checks live mutation of transitions, nodes, endings, triggers, and the evaluator and handler maps. Additional assertions check registry isolation, repeated builtin registration, opaque state values, entity unlock order, modifier and prerequisite identity, and reference diagnostic order.

Use the sibling path-enumeration fixtures and existing package and consumer suites alongside this contract for broader coverage of builtins, state helpers, condition composition, formulas, symbolic fingerprints, exported validation helpers, and protocol transports.

## Benchmark

Apple M4 Pro, Bun 1.4.4. Both revisions were built from source. Cells show the median and the minimum–maximum range across 11 samples.

| Workload | TypeScript baseline | Rust/Wasm cutover |
| --- | ---: | ---: |
| Literature RPG `enter-hall` step, µs/op | 1.095 (1.068–1.203) | 12.664 (12.400–13.119) |
| CLI `generate`, ms/process | 134.54 (133.53–138.90) | 149.42 (146.79–153.95) |
| CLI semantic solver in-process, ms/op | 0.576 (0.539–0.646) | 4.862 (4.626–4.999) |
| CLI peak resident memory, MiB/process | 129.78 (128.05–131.44) | 155.20 (150.47–160.45) |

Each gameplay sample runs 10,000 steps from a fixed entrance state with a precomputed entity context. Each solver sample runs 20 validations on the extracted story graph and empty world used by the CLI generator. Both use three warm-up batches. The full CLI timings include Bun startup, source discovery, extraction, solving, and writes to a scratch directory. They use fresh Bun processes after one warm-up launch. Both versions emitted 12 semantic warnings. The separate CLI `validate` command reads prebuilt metadata.

Peak memory is measured around the full CLI process using macOS `/usr/bin/time -l` and its maximum resident set size output, converted from bytes to MiB. The runs alternate between revisions and use one warm-up launch per revision. These are local Bun timings on one graph, with memory limited to the CLI process.

## Browser conformance

Build the production Literature RPG web app, then install pinned Playwright and Chromium in a temporary directory.

```sh
bun run --cwd apps/literature-rpg-web build
fixture_tools="$(mktemp -d)"
npm install --prefix "$fixture_tools" --no-audit --no-fund playwright@1.59.1
"$fixture_tools/node_modules/.bin/playwright" install chromium
PLAYWRIGHT_MODULE="$fixture_tools/node_modules/playwright/index.mjs" \
  bun packages/runtime/conformance/cutover/browser.ts
```

The browser test serves production artifacts on a free loopback port, verifies the app instantiated its Rust WebAssembly module, and plays two choices to check the resulting scene, turn, and inventory. A browser bundle of the fixture exercises v1 save restoration and an opaque JavaScript value passed through synchronous callbacks. On a Linux CI runner use `install --with-deps chromium`. If testing with an existing Google Chrome installation, set `PLAYWRIGHT_CHANNEL=chrome`.
