# Decision: Persistence Contract for `serializeState` / `deserializeState`

**Date:** 2026-05-20

## Context

[docs/NORTH_STAR.md](../NORTH_STAR.md) Milestone 3.7.c requires a pinned, documented persistence contract before any real consumer is allowed to ship. Persistence itself lives in the consumer (per the headless-engine direction), but the **shape** the consumer must store and the **migration story** when that shape changes are framework concerns. Without these, the first consumer invents something the framework will later contradict.

The framework already exposes `serializeState(state)` and `deserializeState(data)` from `@fiction-map/runtime`. Until now the emitted JSON had no version marker and no documented stability guarantees.

## Decision

### 1. The serialized shape is `SerializableState`

```typescript
interface SerializableState {
  schemaVersion: 1               // NEW — added with this ADR
  currentNodeId: string
  history: string[]
  variables: Record<string, unknown>
  flags: Record<string, boolean | string | number>
  visited: string[]              // Set serialized as array
  entityState?: SerializableEntityState
  extensions?: Record<string, unknown>
}

interface SerializableEntityState {
  owned: string[]                // Set serialized as array
  active: string[]               // Set serialized as array
  unlocked: string[]             // Set serialized as array
  resources: Record<string, number>
  extensions?: Record<string, unknown>
}
```

This is the contract consumers persist. They may wrap it in their own envelope (e.g. for save-slot metadata) but must store the entire `SerializableState` object as a single value.

### 2. `schemaVersion` is the migration anchor

- The framework owns this number.
- It increments on **any backward-incompatible change** to `SerializableState` or `SerializableEntityState` (renames, type narrowings, removals, semantic changes).
- It does **not** increment when a new optional field is added.
- `deserializeState` rejects unknown versions with a descriptive error. It does not silently coerce.

### 3. Migrations are consumer-owned, framework-assisted

The framework does not perform migrations itself. Three reasons:

1. Persistence is the consumer's concern (per the headless-engine direction).
2. The consumer knows where saves are stored, in what scope, and which ones still matter.
3. A framework-bundled migration runner would bloat the runtime for everyone to serve a minority case.

The framework provides:

- The current `schemaVersion` as a constant export (so consumers can check inline).
- A short migration recipe in each release that bumps the version, documenting the diff and a reference transform.
- Type exports for both `SerializableState` and `SerializableEntityState` so consumers can write strongly-typed migrations.

The recommended consumer pattern:

```typescript
import { deserializeState, type SerializableState } from "@fiction-map/runtime"

function loadState(raw: unknown): GraphRuntimeState {
  const data = raw as { schemaVersion?: number } & SerializableState
  switch (data.schemaVersion) {
    case undefined:
    case 0:
      return deserializeState(migrateV0ToV1(data))
    case 1:
      return deserializeState(data)
    default:
      throw new Error(`Unknown save schemaVersion: ${data.schemaVersion}`)
  }
}
```

### 4. Stability guarantees

While `schemaVersion === 1`:

- Existing field names will not change.
- Existing field types will not narrow (e.g. `unknown` → `string` is a breaking change requiring a bump).
- `Set` ⇄ `array` conversion at the serialization boundary is permanent for these fields.
- New optional fields may be added without a bump; consumers must tolerate unknown extra fields on read (already the case).
- The order of `history`, `visited`, etc. is preserved on round-trip.

Out-of-scope and explicitly **not** part of the contract:

- Compression, encryption, or transport format (consumer concern).
- Migration of consumer-owned data inside `extensions` (the framework treats them as opaque).
- Schema versions of graph definitions themselves (covered by `metadata.json`, separate contract).

## Rationale

1. **Anchor before adoption.** Adding `schemaVersion` now, before any real consumer persists state, costs nothing. Adding it later forces every consumer to write a "treat missing version as 0" migration.
2. **One number, one direction.** A single integer is the smallest mechanism that supports migration. JSON-schema-style versioning is over-engineered for state that is read by exactly one runtime.
3. **Consumer ownership matches the rest of the framework.** Persistence storage, save-slot UX, and migration triggers are all consumer concerns. The framework provides the format and the version, not the orchestration.
4. **Reject unknown versions loudly.** Silent acceptance of unknown shapes is how stale saves corrupt new sessions. Throwing forces the consumer to write an explicit migration or to refuse the save.
5. **Don't ship a migration runner yet.** No consumer has hit this problem. Designing the runner without a real use case will get the API wrong. The recipe + types + version constant cover the immediate need.

## Implications for Future Agents

- **When changing `SerializableState` or `SerializableEntityState`:** decide first whether the change requires a `schemaVersion` bump. If yes, bump the constant, document the migration in the release notes, and update `deserializeState` to reject the previous version with a pointer to the recipe.
- **When adding new optional fields:** no bump required. Document the field. Ensure `deserializeState` defaults the field sensibly when absent.
- **When asked to add a framework-level migration runner:** refuse and cite this decision, unless a real consumer has hit the wall (more than one save corruption traceable to lack of orchestration).
- **When a consumer asks "how do I save game state?":** point them at `serializeState(state)`, the JSON shape above, and the migration recipe in this ADR.

## Revisit Criteria

Reopen this decision only if:

- A real consumer demonstrates that consumer-owned migration is genuinely insufficient (e.g. multiple consumers all writing the same migration shim), **or**
- The serialization format needs to support something the JSON shape cannot (binary, streaming, very large states), **or**
- `schemaVersion` increments more than twice in a single release cycle, indicating the contract was wrong.
