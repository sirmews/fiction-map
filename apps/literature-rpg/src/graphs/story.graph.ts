/**
 * Static graph definition for `fiction-map generate`.
 *
 * This drives `metadata.json` and `SEMANTICS.md` so agents and CI can
 * read the structure without running the app. The runtime in `main.ts`
 * exercises the same nodes/edges programmatically.
 *
 * NOTE: today `defineGraph` (core) and `GraphRuntime` (runtime) take
 * different shapes, so the same graph is expressed twice — once here for
 * the static layer and once in `main.ts` for the runtime layer. See
 * NOTES.md item 1.
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
