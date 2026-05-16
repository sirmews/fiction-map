# Twine

## Classification

- **Nature:** full authoring product
- **Relevance:** medium, mostly as a contrast case

## Official sources

- [Twine home](https://twinery.org/)
- [Story formats overview](https://twinery.org/cookbook/terms/terms_storyformats.html)

## What it is

Twine is an open-source tool for interactive, nonlinear stories.

It is intentionally approachable, and its story formats act like lightweight engines that define:

- available features
- authoring conventions
- runtime behavior

## Authoring model

Twine is passage-based and visually oriented.

The user:

- creates passages
- connects them
- mixes prose with variables/macros depending on story format

The result is very product-oriented rather than engine-oriented.

## Runtime model

The runtime is strongly shaped by the chosen story format. In practice, the authored output is
very close to the final presentation/runtime model.

That makes it powerful for authors, but weaker as a cleanly separated headless engine reference.

## What transfers cleanly to Fiction Map

- low-friction authoring matters
- pluggable output/runtime formats are conceptually useful

## What does not transfer cleanly

- tight coupling between authoring, output, and presentation
- story-format-specific runtime assumptions

## Traps to avoid

- allowing the authored output shape to dictate the engine boundary
- coupling rendering and logic
- mistaking an authoring product architecture for an engine architecture

## Judgment for Fiction Map

Twine is useful primarily as a warning.

It is a strong example of a successful product for authors, but it is not a strong model for a
headless library/framework that should be imported by a separate app.
