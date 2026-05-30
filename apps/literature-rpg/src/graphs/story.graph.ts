/**
 * Static graph definition for `fiction-map generate`.
 *
 * This drives `metadata.json`, `SEMANTICS.md`, and runtime execution so
 * agents, CI, and the app all read the same authored graph structure.
 */

import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { id: "entrance", type: "scene", title: "Entrance", body: "You stand at the entrance to the old library." },
    { id: "main-hall", type: "scene", title: "Main Hall", body: "Dust motes float in shafts of grey light. A lantern sits on a table." },
    { id: "dark-chapter", type: "scene", title: "Dark Chapter", body: "A narrow passage drops into darkness." },
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
    },
  ],
});
