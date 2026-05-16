# Visual Libraries Explicitly Out of Scope

This file exists to prevent architectural drift.

We looked at these systems, but they are **not** the target model for Fiction Map because the
current direction is to keep Fiction Map headless and let a separate consumer app own the UI.

## React Flow

- **Nature:** React-based graph/canvas UI toolkit
- **Official sources:** [concepts](https://reactflow.dev/learn/concepts/terms-and-definitions), [examples](https://reactflow.dev/examples)
- **Why it was considered:** excellent candidate for a separate Story Editor app's canvas
- **Why it is out of scope for Fiction Map:** it solves visual graph interaction, not narrative
  runtime or schema/tooling contracts

## Rete.js

- **Nature:** visual node editor framework with processing concepts
- **Official source:** [editor concept](https://retejs.org/docs/concepts/editor/)
- **Why it was considered:** combines editor and execution ideas
- **Why it is out of scope for Fiction Map:** it invites tighter coupling between editor and
  execution than we want in the Fiction Map package surface

## JointJS

- **Nature:** diagramming framework
- **Official source:** [docs](https://docs.jointjs.com/)
- **Why it was considered:** mature graph/diagram infrastructure
- **Why it is out of scope for Fiction Map:** diagramming sophistication is not the current
  bottleneck; engine contracts are

## GoJS

- **Nature:** enterprise diagramming framework
- **Official source:** [intro](https://gojs.net/latest/intro/)
- **Why it was considered:** polished interaction and templating model
- **Why it is out of scope for Fiction Map:** same reason as JointJS, plus it pulls attention
  toward enterprise diagram tooling rather than headless runtime design

## Decision

These libraries may still be useful in a separate consumer app.

They should not shape the core package boundary of Fiction Map. The engine should not depend on
canvas frameworks, layout coordinates, or editor interaction models.
