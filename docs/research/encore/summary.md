# Encore Research — DeepWiki Findings

> Retrieved 2026-05-01 from deepwiki.com/encoredev/encore

---

## Core Philosophy: Declarative Infrastructure

Encore's fundamental approach: **define backend resources as type-safe objects directly in application code** rather than through separate configuration files.

```typescript
// Infrastructure defined as code objects
export const signups = new Topic<SignupEvent>("signups", {
    deliveryGuarantee: "at-least-once",
});

export const userDB = new SQLDatabase("users", {
    migrations: "./migrations",
});
```

The framework uses **static analysis** to parse application code and extract both logical architecture and infrastructure requirements, then automatically generates boilerplate code and orchestrates the necessary infrastructure for each environment.

---

## Three Main Components

1. **Backend Frameworks** (Encore.ts and Encore.go) — Declarative APIs for infrastructure resources
2. **Local Development Environment** — `encore` CLI and `encore daemon` orchestrate local infrastructure
3. **Optional Cloud Platform** (Encore Cloud) — Automated infrastructure provisioning

---

## TypeScript Parser (tsparser) — How It Works

### Resource Discovery Through Tracked Names

The parser uses **SWC** (a Rust-based TypeScript parser) with decorator support enabled to parse TypeScript files. The parser looks for specific **file conventions and imports** rather than decorators—it tracks imports from Encore packages like `encore.dev/api`, `encore.dev/storage/sqldb`, and other infrastructure modules.

The system uses a `TrackedNames` mechanism to identify when these Encore modules are imported, then parses their usage patterns. For API endpoints specifically, it looks for calls to `api.endpoint({...}, handler)` with configuration objects and handler functions.

### Type Resolution and Schema Building

The `ParseContext` orchestrates parsing through a `ModuleLoader`, `TypeChecker`, and `FileSet`. The `TypeChecker` resolves complex TypeScript types including generics, conditional types, and mapped types.

A `SchemaBuilder` transforms resolved TypeScript types into Protocol Buffer schema structures. It maintains a declaration registry (`obj_to_decl`) mapping TypeScript objects to schema declarations.

### Protocol Buffer Metadata Generation

The `MetaBuilder` struct orchestrates the final metadata generation, holding a `SchemaBuilder` and producing a `v1::Data` Protocol Buffer message.

The `build()` method iterates through parsed services and resources, populating the `v1::Data` structure with:
- Service definitions (`svcs`)
- Package information (`pkgs`)
- RPC/endpoint definitions
- Database, topic, and bucket resources

For each API endpoint, it extracts configuration like HTTP methods, paths, request/response schemas, authentication requirements, and static asset handling, converting them into `v1::Rpc` protobuf messages.

The final `v1::Data` structure includes fields for declarations, packages, services, auth handlers, cron jobs, pub/sub topics, middleware, cache clusters, SQL databases, buckets, and gateways—all populated during the metadata generation process.

### Wire Format Specifications

The parser handles special wire format types like `Header<T, 'name'>`, `Query<T, 'name'>`, and `Cookie<T, 'name'>` that control HTTP encoding. These are analyzed to determine where request/response fields appear in the HTTP message.

**Key insight:** The tsparser does **not** use TypeScript decorators as the primary mechanism. Instead, it uses **import tracking** to identify Encore framework usage and then **AST analysis** to extract resource definitions from function calls and variable assignments.

---

## Code Generation Pipeline

### Steps

1. **Static Analysis and Parsing** — The `Encore Parser` statically analyzes Encore applications to build an `Encore Syntax Tree (EST)`. This process extracts the logical architecture and infrastructure requirements directly from your application code.

2. **Compilation and Source Code Rewriting** — The `Encore Compiler` rewrites the source code based on the `EST`. This step involves rewriting API calls and handlers, and injecting instrumentation and secret values.

3. **Runtime Wrapper Generation** — For Go services, Encore automatically generates `encore.gen.go` files in your service directory. These files contain package-level functions that simplify calling APIs defined as methods on service structs. These wrappers are automatically updated when your API endpoints change. You can manually trigger this generation using `encore gen wrappers`.

4. **Client Library Generation** — Encore generates type-safe API clients for various languages, including Go, TypeScript, JavaScript, and OpenAPI specifications. These clients include all publicly accessible endpoints, data structures, and documentation strings. The `encore gen client` command is used to generate these clients. The generated client's structure is idiomatic to the target language.

### Templates

Encore uses internal mechanisms to generate code, which are not directly exposed as user-editable templates. The generated files, such as `encore.gen.go` and client library files, are marked with "Code generated by Encore. DO NOT EDIT."

The `testdata` directories within the `v2/codegen/apigen` and `pkg/clientgen` modules contain examples of the input source code and the expected generated output, which serve as internal templates or reference points for the code generation logic.

---

## Constraint Enforcement

### Static Analysis and `encore check`

Encore uses static analysis to build an "Encore Syntax Tree (EST)" of the application, which helps in understanding the application's architecture and infrastructure requirements. The `encore check` command verifies application syntax and checks for compile-time errors using Encore's compiler. This command can also be configured to parse tests.

### Request Validation

For TypeScript applications, Encore.ts integrates request validation directly with TypeScript types. This means that the API schema defined in your TypeScript interfaces is used to validate incoming requests at runtime. If a request is missing required fields or does not conform to the defined types, Encore will return a `400 Bad Request` response.

Encore.ts supports various validation types, including:
- **Basic Types**: `string`, `number`, `boolean`
- **Optional and Nullable Fields**: Using `?` for optional fields and `| null` for nullable fields
- **Union Types**: Allowing a field to be one of several types
- **Value-based Validation Rules**: These are composable rules imported from `encore.dev/validate` that allow for more specific checks like minimum/maximum values (`Min<N>`, `Max<N>`), string/array lengths (`MinLen<N>`, `MaxLen<N>`), and format validation (`IsURL`, `IsEmail`, `MatchesRegexp`). These rules are executed in Rust for performance.

For Go applications, request types can implement a `Validate() error` method. If this method is present, Encore's middleware will call it after payload deserialization.

### Key Difference from AST-grep

Encore does **not** use external lint tools like AST-grep. Instead, it relies on:
1. Built-in static analysis during compilation
2. Runtime validation via schemas
3. The `encore check` command

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│ CLI Layer                                                │
│ User interface for runtime operations                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Daemon Layer                                             │
│ daemon.Server, run.Manager                               │
│ Coordination and lifecycle management                    │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Execution Layer                                          │
│ run.Run, run.ProcGroup, RuntimeConfigGenerator          │
│ Process execution and configuration                      │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Infrastructure Layer                                     │
│ infra.ResourceManager, various infrastructure services  │
│ Resource provisioning and management                     │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Application Layer                                        │
│ Application and gateway processes                        │
│ Actual running application code                          │
└─────────────────────────────────────────────────────────┘
```

---

## Infrastructure Primitives

| Primitive | Purpose |
|-----------|---------|
| **Services** | Microservice definitions with automatic service discovery |
| **APIs** | Type-safe endpoints with automatic validation and documentation |
| **Databases** | SQL database definitions with automatic migration management |
| **Pub/Sub** | Message queues with type-safe event definitions |
| **Cron Jobs** | Scheduled tasks with declarative timing configuration |
| **Object Storage** | Cloud storage buckets with unified API across providers |
| **Caching** | Distributed caching with automatic key management |

---

## Key Files to Reference

| Component | Path |
|-----------|------|
| TypeScript Parser | `tsparser/` |
| Code Generation | `tsparser/src/builder/codegen.rs` |
| Templates | `tsparser/src/builder/templates/` |
| Client Generation | `pkg/clientgen/` |
| Runtime Core | `runtimes/core/` |
| JS Runtime | `runtimes/js/` |
| Go Runtime | `runtimes/go/` |

---

## Lessons for Fiction Map

1. **Import tracking > decorators** — Track imports from `@your-org/story-runtime` to identify resource usage
2. **SWC parser in Rust** — Could use ast-grep instead, which also uses tree-sitter
3. **Protocol Buffer metadata** — Could generate simpler JSON/TypeScript metadata instead
4. **Built-in check command** — ast-grep serves this purpose for us
5. **Templates for codegen** — Use handlebars or similar for generating clients/wrappers
6. **Multi-layer architecture** — Keep separation between parser, generator, and runtime

---

## Additional Documentation

| Document | Description |
|----------|-------------|
| [user-experience.md](user-experience.md) | Dashboard, visualization, graph representation, TraceNode pattern |
| [daemon-architecture.md](daemon-architecture.md) | How Encore's daemon works, what it means for Fiction Map |
| [deepwiki-raw.md](deepwiki-raw.md) | Full DeepWiki output (332KB) |
