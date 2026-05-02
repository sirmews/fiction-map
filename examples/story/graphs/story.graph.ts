import { defineGraph } from "@fiction-map/core"

/**
 * @description A simple story graph
 */
export const story = defineGraph({
  id: "story",
  nodes: [
    { id: "start", type: "scene", title: "The Beginning" },
    { id: "middle", type: "scene", title: "The Middle" },
    { id: "end", type: "scene", title: "The End", isEnding: true },
  ],
  edges: [
    { id: "c1", type: "choice", source: "start", target: "middle", text: "Continue" },
    { id: "c2", type: "choice", source: "middle", target: "end", text: "Finish" },
  ],
})
