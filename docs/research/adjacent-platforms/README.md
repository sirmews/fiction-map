# Adjacent Platforms and Packages

Durable research on systems adjacent to Fiction Map.

This folder is intentionally split into:

- **Headless and product-adjacent systems in scope**
- **Visual libraries explicitly out of scope for Fiction Map**

The current product boundary remains:

- Fiction Map is a headless engine/framework and tooling layer
- the consumer app owns schemas, UI, and product workflows

## In Scope

| File | Type | Why it matters |
|------|------|----------------|
| [ink-inky.md](ink-inky.md) | Engine + authoring app | Strong runtime/editor separation and export model |
| [yarn-spinner.md](yarn-spinner.md) | Engine + editor extensions | Strong host-bridge runtime and integration story |
| [twine.md](twine.md) | Full authoring product | Useful contrast case for UI/runtime coupling |
| [arcweave.md](arcweave.md) | Full narrative platform | Strong product-side reference for a consumer app |
| [articy-draft.md](articy-draft.md) | Full narrative platform | Strong enterprise reference for schema/template/export discipline |
| [xstate-stately.md](xstate-stately.md) | Headless runtime + visual tooling | Strong package boundary and model/runtime separation reference |

## Explicitly Out of Scope

| File | Type | Why it is documented |
|------|------|----------------------|
| [visual-libraries-out-of-scope.md](visual-libraries-out-of-scope.md) | UI toolkit survey | Prevent drift back toward building Fiction Map around canvas/toolkit concerns |

## Quick Comparison

| System | Primary nature | Authoring model | Runtime model | Best lesson for Fiction Map |
|--------|----------------|-----------------|---------------|-----------------------------|
| ink / Inky | Engine + editor | Text-first script | Host-driven narrative runtime | Keep runtime headless and host-owned |
| Yarn Spinner | Engine + editor extensions | Node-based script | Bridge object delivers content to host UI | Treat runtime as a bridge, not a UI |
| Twine | Full product | Passage graph + story format | HTML/story-format execution | Avoid coupling authoring output to presentation runtime |
| Arcweave | Full platform | Visual narrative workspace | Data export + plugins/API | Strong separation between editor product and integrations |
| articy:draft | Full platform | Object/template + flow authoring | Export/integration/scripting | Template/schema discipline without copying the whole platform |
| XState / Stately | Headless engine + visual tools | Statechart model in code or Studio | Deterministic runtime | Excellent package layering and optional visual tooling |

## Current Judgment

The strongest architectural references for Fiction Map are:

- **ink** for host-owned runtime behavior
- **Yarn Spinner** for engine-to-host integration boundaries
- **XState/Stately** for package layering and optional visual tooling

The strongest product references for a separate consumer app are:

- **Arcweave**
- **articy:draft**

The strongest warning cases are:

- **Twine** for UI/runtime coupling
- **visual graph libraries** as a basis for the engine itself
