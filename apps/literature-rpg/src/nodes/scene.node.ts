import { defineNodeType } from "@fiction-map/core"
import { registry } from "../project"

export const SceneNode = defineNodeType(registry, {
  id: "scene",
  properties: {
    title: { type: "string" },
    body: { type: "string" },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})
