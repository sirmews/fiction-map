# ink / Inky

## Classification

- **Nature:** headless narrative engine plus dedicated authoring app
- **Relevance:** high

## Official sources

- [ink home](https://www.inklestudios.com/ink/)
- [ink writer's manual](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)

## What it is

ink is a narrative scripting language built by inkle for highly branching game narrative.
Inky is the official editor for writing, testing, and exporting ink stories.

The official site describes ink as:

- a narrative scripting language for games
- "markup, not programming"
- a narrative engine "conceived as middleware"
- exportable to JSON as an intermediate compiled format

## Authoring model

ink is text-first, not graph-first.

Writers author:

- prose
- choices
- diverts/jumps
- variables and logic

This gives it strong writer ergonomics, but it also means the underlying structure is not a
clean graph-editor model.

## Runtime model

ink is designed to slot into a host game engine.

The engine:

- evaluates the story state
- produces the next content/choices
- exports a compiled JSON representation

The host application:

- renders UI
- handles side effects
- integrates the story with game systems

This is a very strong separation.

## What transfers cleanly to Fiction Map

- keep the runtime headless
- keep the editor/product separate from the engine
- use an intermediate serialized representation
- let the host app own rendering and product behavior

## What does not transfer cleanly

- text-first scripting as the canonical authoring model
- graph visualization over a heavily scripted narrative language

If Fiction Map is staying graph-oriented, copying ink's authoring model too closely would fight
the rest of the architecture.

## Traps to avoid

- building a custom narrative language/compiler too early
- trying to bolt a graph editor on top of a script-first model

## Judgment for Fiction Map

ink is one of the best references for runtime boundaries and export discipline.

It is not a strong reference for Fiction Map's authoring model, because Fiction Map is trying to
be a graph-oriented engine framework rather than a bespoke narrative scripting language.
