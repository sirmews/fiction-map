export type ContextPackKind =
  | "project-summary"
  | "graph-system"
  | "dev-runtime"
  | "validation"
  | "graph-detail"
  | "node-type-detail"
  | "edge-type-detail"
  | "validation-issue-detail"

export type CuratedSourceKind = "doc" | "code" | "metadata"

export interface CuratedSource {
  focus?: string
  kind: CuratedSourceKind
  label: string
  packs: ContextPackKind[]
  path: string
  priority: number
  reason: string
}

const CURATED_SOURCES: CuratedSource[] = [
  {
    kind: "doc",
    label: "README product overview",
    packs: ["project-summary"],
    path: "README.md",
    priority: 1,
    reason: "Defines the framework purpose and the intended developer-facing workflow.",
  },
  {
    focus: "Look for the Milestone 4 goals and the intended `fiction-map dev` experience.",
    kind: "doc",
    label: "North Star",
    packs: ["project-summary"],
    path: "docs/NORTH_STAR.md",
    priority: 2,
    reason: "Captures the product direction and milestone framing.",
  },
  {
    focus: "Look at Task 6 onward to see what is implemented versus still pending.",
    kind: "doc",
    label: "Current Milestone 4 plan",
    packs: ["project-summary", "dev-runtime"],
    path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
    priority: 3,
    reason: "Tracks the current implementation order and the remaining milestone work.",
  },
  {
    focus: "Look at refresh lifecycle and last-good-metadata behavior.",
    kind: "code",
    label: "Dev server state lifecycle",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/dev-server/src/state.ts",
    priority: 4,
    reason: "Defines refresh semantics, queued invalidation, and error preservation.",
  },
  {
    focus: "Look at health endpoint, WebSocket request handling, and metadata-changed broadcasts.",
    kind: "code",
    label: "Server transport",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/dev-server/src/server.ts",
    priority: 5,
    reason: "Shows the live transport boundary between state, watcher events, and dashboard clients.",
  },
  {
    focus: "Look at supported file suffixes, excluded paths, and debounce handling.",
    kind: "code",
    label: "Watcher boundary",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/watcher.ts",
    priority: 6,
    reason: "Shows which filesystem changes actually trigger refresh behavior.",
  },
  {
    focus: "Look at metadata, graph, notification, and error types.",
    kind: "code",
    label: "RPC protocol contract",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/protocol.ts",
    priority: 7,
    reason: "Defines the typed wire contract the dashboard client talks to.",
  },
]

export function getCuratedSourcesForPack(pack: ContextPackKind): CuratedSource[] {
  return CURATED_SOURCES.filter((source) => source.packs.includes(pack)).sort(
    (left, right) => left.priority - right.priority
  )
}
