# Fiction Map Rust runtime

Rust implements state, conditions, effects, transitions, traversal, and validation. The `@fiction-map/runtime` package embeds the compiled WebAssembly and presents the existing synchronous TypeScript interface. The bindings pass live JavaScript values and callbacks to Rust. This preserves identity and lets application extensions run in their host.

The native library also exports `fiction_map_runtime::enumerate_paths`. The executable accepts one JSON enumeration request per line and emits one result per line. The [wire schema](../runtime/conformance/path-enumeration.schema.json) defines that transport and generates both bindings. The native JSON and WebAssembly hosts share the Rust traversal, condition dispatch, effect operations, and formula parser.

## Build and verify

```sh
rustup target add wasm32-unknown-unknown
bun install --frozen-lockfile
bun run build
cargo test --locked --manifest-path packages/runtime-rs/Cargo.toml
bun run packages/runtime/conformance/compare.ts
bun run packages/runtime/conformance/cutover/contract.ts
```

The workspace build generates the matching wasm-bindgen glue and embeds the Wasm. The package can then be imported synchronously. Run the build before tests or type checks in a fresh checkout.

The enumeration comparison exercises the native and WebAssembly hosts against the pinned outputs. The [runtime cutover contract](../runtime/conformance/cutover/README.md) also covers browser gameplay, older saves, and observable callback behavior against the original TypeScript runtime's results. GitHub Actions runs both checks.

After changing the native wire schema, run `bun run packages/runtime/conformance/generate.ts` to refresh the wire bindings.
