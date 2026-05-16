# XState / Stately

## Classification

- **Nature:** headless runtime with optional visual tooling
- **Relevance:** very high architecturally

## Official sources

- [Stately & XState docs](https://stately.ai/docs)
- [Packages](https://stately.ai/docs/packages)

## What it is

XState is a headless state machine runtime.
Stately provides visual tooling and related developer experience around that runtime.

The docs make the layering clear:

- state machines
- actors
- official packages
- developer tools
- Stately Studio

## Authoring model

Models can be created in code and also represented visually in Stately's tooling.

This is important because it shows a clean separation between:

- canonical machine/runtime model
- optional visual tooling layered on top

## Runtime model

XState is deterministic and headless.

The package model is especially relevant:

- official runtime packages
- framework integrations
- graph/test/store packages

That is a strong example of a package ecosystem that remains centered on the runtime contract.

## What transfers cleanly to Fiction Map

- package layering discipline
- keeping visual tooling optional rather than foundational
- strong model/runtime contract first, integrations second

## What does not transfer cleanly

- statechart formalism is not a natural authoring model for long-form branching narrative
- too much explicit machine ceremony can make content authoring harder

## Traps to avoid

- forcing every story structure into statechart semantics
- confusing determinism and formalism with good authoring ergonomics

## Judgment for Fiction Map

XState/Stately is one of the best references for package architecture and separation of concerns.

It is not a direct content-model analogue, but it is a very strong example of how to keep the
engine headless while allowing optional visual tooling elsewhere.
