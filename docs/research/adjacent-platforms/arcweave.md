# Arcweave

## Classification

- **Nature:** full narrative design platform
- **Relevance:** high for the consumer app, medium for the engine itself

## Official sources

- [Arcweave home](https://arcweave.com/)
- [Features](https://arcweave.com/features)
- [Arcweave for Developers](https://docs.arcweave.com/introduction/whom-is-it-for/developers)

## What it is

Arcweave is a web-based platform for designing and managing interactive narrative content.

Its docs and features show a product with:

- visual authoring
- boards, elements, connections, labels, jumpers, branches, variables, and Arcscript
- play mode and debugger
- export, sharing, localization, and AI-assisted tools
- plugins and Web API for developers

## Authoring model

Arcweave is visual and workspace-oriented.

Authors operate on project items such as:

- boards
- elements
- connections
- components
- branches
- attributes
- variables

This is much closer to the shape of a consumer authoring app than to a headless engine package.

## Runtime/integration model

Arcweave supports developer-facing integration through:

- exported project data
- engine plugins
- Web API access to project content

The developer docs explicitly position Arcweave as a source of structured narrative data for
developers to consume.

## What transfers cleanly to Fiction Map

- strong separation between authoring product and integration surface
- disciplined structured data export
- treating authored narrative as the source of truth for downstream consumers

## What does not transfer cleanly

- collaboration, workspace, API, and platform complexity
- broader product surface like AI tools, style editors, and sharing workflows

## Traps to avoid

- turning Fiction Map itself into a workspace platform
- building collaboration/cloud features before stabilizing the headless contract

## Judgment for Fiction Map

Arcweave is one of the best reference points for what a separate Story Editor app could grow into.

It is not the right model for what should live inside the Fiction Map package surface.
