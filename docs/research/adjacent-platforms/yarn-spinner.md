# Yarn Spinner

## Classification

- **Nature:** headless runtime plus editor extensions and engine integrations
- **Relevance:** very high

## Official sources

- [Yarn Spinner home](https://www.yarnspinner.dev/)
- [Features](https://www.yarnspinner.dev/features/)
- [Dialogue Runner docs](https://docs.yarnspinner.dev/components/dialogue-runner)

## What it is

Yarn Spinner is a dialogue system for games with:

- a dedicated dialogue language
- editor support
- graph view and preview/test workflows
- integrations for Unity, Godot, Unreal, and other engines

Its feature docs present it as a full narrative toolchain for planning, writing, integrating,
and testing dialogue.

## Authoring model

Yarn uses node-based dialogue scripts authored in text, with editor tooling layered around them.

The official feature set includes:

- syntax highlighting and autocomplete
- graph view
- preview and test inside the editor
- exportable HTML previews

So the authoring experience is not purely text-first and not purely graph-first. It is a hybrid:
scripted nodes with visual navigation.

## Runtime model

The most important runtime concept is the **Dialogue Runner**.

The docs describe it as the bridge between Yarn scripts and the game. It handles loading,
running, and delivering dialogue content to the UI and game systems.

This is a strong host/engine boundary:

- runtime interprets dialogue
- views present content
- host app/game executes commands and updates systems

## What transfers cleanly to Fiction Map

- an explicit bridge object between engine and host UI
- command/callback style integration
- extensible architecture where hosts can swap presentation
- packaging discipline around "runtime core + integrations"

## What does not transfer cleanly

- dialogue-language complexity if Fiction Map stays more general than dialogue
- custom compiler/parser investment for a solo-built system

## Traps to avoid

- inventing a full DSL too early
- optimizing the engine for dialogue-specific workflows if Fiction Map is meant to stay broader

## Judgment for Fiction Map

Yarn Spinner is one of the strongest comparators.

It is especially valuable for:

- runtime API design
- host integration boundaries
- understanding how a reusable engine can support multiple consumer applications without owning
  the final UI
