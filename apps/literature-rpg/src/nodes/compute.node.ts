import { defineNodeType } from "@fiction-map/core"
import { registry } from "../project"

export const ComputeNode = defineNodeType(registry, {
  id: "compute",
  properties: {},
  autoResolve: true,
})
