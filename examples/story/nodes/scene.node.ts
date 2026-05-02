import { defineNodeType } from "@fiction-map/core"

/**
 * @description A scene in the story graph
 * @ai-rule Scenes must have content or be marked as endings
 */
export const SceneNode = defineNodeType({
  id: "scene",
  properties: {
    title: { type: "string", required: true },
    content: { type: "richtext" },
    isEnding: { type: "boolean", default: false },
  },
  outgoingEdges: ["choice"],
  incomingEdges: ["choice"],
})
