import { describe, expect, it } from "vitest";
import type { GraphDefinition } from "@fiction-map/core";
import {
  createInitialState,
  graphDefinitionToBlueprint,
  createRuntimeFromGraph,
} from "./index";

function makeGraph(): GraphDefinition {
  return {
    id: "library-mystery",
    name: "libraryMysteryGraph",
    location: { file: "graphs/story.graph.ts", line: 17, column: 22 },
    nodes: [
      { id: "entrance", type: "scene", title: "Entrance" },
      { id: "main-hall", type: "scene", title: "Main Hall" },
      { id: "dark-chapter", type: "scene", title: "Dark Chapter" },
    ],
    edges: [
      {
        id: "enter-hall",
        type: "choice",
        source: "entrance",
        target: "main-hall",
        text: "Step inside",
        effects: [{ type: "grantEntity", entityId: "lantern" }],
      },
      {
        id: "descend",
        type: "choice",
        source: "main-hall",
        target: "dark-chapter",
        text: "Descend into the passage",
        conditions: [{ type: "hasEntity", entityId: "lantern" }],
        tone: "ominous",
      },
    ],
    nodeCount: 3,
    edgeCount: 2,
    maxDepth: 2,
    endings: ["dark-chapter"],
    nodeTypesUsed: ["scene"],
    edgeTypesUsed: ["choice"],
    conditionsUsed: ["hasEntity"],
    effectsUsed: ["grantEntity"],
    errors: [],
    warnings: [],
  };
}

describe("graphDefinitionToBlueprint", () => {
  it("maps a core graph definition into the runtime blueprint shape", () => {
    const blueprint = graphDefinitionToBlueprint(makeGraph());

    expect(blueprint).toEqual({
      nodes: [
        { id: "entrance", type: "scene", title: "Entrance" },
        { id: "main-hall", type: "scene", title: "Main Hall" },
        { id: "dark-chapter", type: "scene", title: "Dark Chapter" },
      ],
      edges: [
        {
          id: "enter-hall",
          source: "entrance",
          target: "main-hall",
          label: "Step inside",
          effects: [{ type: "grantEntity", entityId: "lantern" }],
          metadata: { type: "choice" },
        },
        {
          id: "descend",
          source: "main-hall",
          target: "dark-chapter",
          label: "Descend into the passage",
          conditions: [{ type: "hasEntity", entityId: "lantern" }],
          metadata: { type: "choice", tone: "ominous" },
        },
      ],
      endings: ["dark-chapter"],
    });
  });

  it("creates a runtime that can execute graph-definition edges", () => {
    const runtime = createRuntimeFromGraph(makeGraph());
    const state = createInitialState("entrance");

    const enterHall = runtime.getAvailable(state)[0];
    const result = runtime.step(state, enterHall);

    expect(result.success).toBe(true);
    expect(result.state.currentNodeId).toBe("main-hall");
    expect(result.state.entityState?.owned.has("lantern")).toBe(true);
  });
});
