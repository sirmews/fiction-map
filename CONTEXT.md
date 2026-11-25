# Fiction Map

A headless engine framework for graph-based systems — stories, workflows, games, and decision trees. This glossary is the canonical vocabulary for the domain; code, docs, and conversation should use these terms.

## Language

### Graph structure

**Graph**:
A named, traversable structure of nodes and transitions defined by a consumer app. The engine's unit of execution and validation.
_Avoid_: story, flowchart, diagram (those are consumer or visual concerns)

**Node**:
A position in a graph with properties and outgoing transitions. Defined by a node type.
_Avoid_: scene, state (a node is a place; state is where a session is)

**Node type**:
The schema-side definition of a kind of node: its properties and allowed outgoing transitions.

**Transition**:
A directed, conditional connection between nodes that may carry effects. The runtime's unit of movement.
_Avoid_: edge (the schema-side concept), choice, link

**Edge type**:
The schema-side definition constraining which node types a transition may connect.

**Project**:
A registry of a consumer's node types, edge types, and graphs — the authoring boundary. One project per consumer app.
_Avoid_: workspace, story

### Runtime execution

**Runtime**:
The engine that executes graph traversals: computing available transitions, applying effects, and producing traceable results.

**State**:
The complete, immutable value describing where a session is: current node, history, variables, flags, visited set, and entity state.
_Avoid_: save, snapshot (those are persistence forms of state)

**Step**:
A single transition application: state + chosen transition → new state + trace.

**Walk**:
An automatic sequence of steps taken without player input (e.g., through auto-resolving nodes).

**Path enumeration**:
Bulk exploration of all reachable paths through a graph up to a depth/path bound — used for validation and analysis, not live play.

**Trigger**:
A condition-gated bundle of effects evaluated after each step, independent of the transition just taken.
_Avoid_: event, hook (a trigger fires on state, not on an external event)

### Conditions and effects

**Condition**:
A predicate evaluated against state (and optional derived context) that gates transition visibility, requirements, or trigger firing.

**Effect**:
A state transformation applied during a step or by a trigger.

**Derived state**:
Context computed from the world and current state at evaluation time — never stored as truth itself.

### World and entities

**World**:
A consumer-defined collection of entities (characters, items, locations, factions) that a graph's runtime state can reference.

**Entity**:
An instance inside a world: a typed thing with properties, references, modifiers, prerequisites, and unlocks.

**Entity type**:
The schema-side definition of a kind of entity.

### Plugins and capabilities

**Plugin**:
Consumer-registered code that extends engine behavior — a custom condition evaluator or effect handler, which may call external systems such as LLMs.
_Avoid_: handler, callback (those are the code-level names; plugin is the domain concept)

**Capability**:
A plugin invocation boundary: the engine asks a named capability for a result and receives one back. Capabilities are the only sanctioned source of non-determinism.
_Avoid_: service, tool

### Sessions and replay

**Session**:
One continuous playthrough of a graph from an initial state to a terminal state (or abandonment).

**Journal**:
The append-only record of a session's capability requests and responses, plus the choices that drove it. The deterministic replay source.
_Avoid_: log, history (history is a field inside state; the journal is external to it)

**Record**:
Running a session live while appending every capability exchange to the journal.

**Replay**:
Re-executing a session from its journal without invoking any plugin — responses come from the record.

**Branch**:
A session forked from a journal prefix, producing an alternate timeline.
