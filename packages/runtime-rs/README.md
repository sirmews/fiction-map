# Rust path enumeration

`fiction_map_runtime::enumerate_paths` consumes an `EnumerationRequest` and returns the ordered paths, serialized final states, or the traversal error. The executable reads one JSON request per line from standard input and emits one JSON result per line.

The [wire schema](../runtime/conformance/path-enumeration.schema.json) defines the graph, built-in parameters, triggers, optional derived entity context, and result. The TypeScript runtime remains the reference for traversal behavior. Application callbacks registered in TypeScript execute in that host. An unregistered operation in a wire request has the same default behavior as in TypeScript.

## Verify parity

From the repository root:

```sh
bun install --frozen-lockfile
bun run build
bun run packages/runtime/conformance/generate.ts --check
cargo test --locked --manifest-path packages/runtime-rs/Cargo.toml
bun run packages/runtime/conformance/compare.ts
```

The comparison checks both engines against pinned golden fixtures and exercises built-in operations, deterministic generated graphs, and the Literature RPG graph. It compares path and step order, termination reasons, state, and error codes and messages. The wire comparison normalizes the host-specific wording of the JavaScript primitive-conversion error.

When the wire schema changes, run `bun run packages/runtime/conformance/generate.ts` to refresh the TypeScript and Rust bindings.
