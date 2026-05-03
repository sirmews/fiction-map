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
    focus: "Look at command registration and what still remains to make `fiction-map dev` a real CLI entrypoint.",
    kind: "code",
    label: "CLI entrypoint",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/cli/src/cli.ts",
    priority: 3,
    reason: "Shows the current public command surface and the missing end-to-end dev command wiring.",
  },
  {
    focus: "Look at reusable metadata generation and the boundary between generation and artifact writing.",
    kind: "code",
    label: "Generator boundary",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/cli/src/generator/index.ts",
    priority: 4,
    reason: "Defines the reusable generator API that the dev server refresh path relies on.",
  },
  {
    focus: "Look at Task 6 onward to see what is implemented versus still pending.",
    kind: "doc",
    label: "Current Milestone 4 plan",
    packs: ["project-summary", "dev-runtime"],
    path: "docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
    priority: 5,
    reason: "Tracks the current implementation order and the remaining milestone work.",
  },
  {
    focus: "Look at normalized runtime options such as root directory, port, and debounce behavior.",
    kind: "code",
    label: "Dev server config",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/config.ts",
    priority: 6,
    reason: "Defines the normalized runtime boundary the CLI and server use.",
  },
  {
    focus: "Look at refresh lifecycle and last-good-metadata behavior.",
    kind: "code",
    label: "Dev server state lifecycle",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/dev-server/src/state.ts",
    priority: 7,
    reason: "Defines refresh semantics, queued invalidation, and error preservation.",
  },
  {
    focus: "Look at method dispatch, error behavior, and how RPC requests reach state operations.",
    kind: "code",
    label: "RPC dispatcher",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/rpc.ts",
    priority: 8,
    reason: "Shows how typed protocol requests become state reads, refreshes, and errors.",
  },
  {
    focus: "Look at health endpoint, WebSocket request handling, and metadata-changed broadcasts.",
    kind: "code",
    label: "Server transport",
    packs: ["project-summary", "dev-runtime"],
    path: "packages/dev-server/src/server.ts",
    priority: 9,
    reason: "Shows the live transport boundary between state, watcher events, and dashboard clients.",
  },
  {
    focus: "Look at supported file suffixes, excluded paths, and debounce handling.",
    kind: "code",
    label: "Watcher boundary",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/watcher.ts",
    priority: 10,
    reason: "Shows which filesystem changes actually trigger refresh behavior.",
  },
  {
    focus: "Look at metadata, graph, notification, and error types.",
    kind: "code",
    label: "RPC protocol contract",
    packs: ["dev-runtime"],
    path: "packages/dev-server/src/protocol.ts",
    priority: 11,
    reason: "Defines the typed wire contract the dashboard client talks to.",
  },
]

export function getCuratedSourcesForPack(pack: ContextPackKind): CuratedSource[] {
  return CURATED_SOURCES.filter((source) => source.packs.includes(pack)).sort(
    (left, right) => left.priority - right.priority
  )
}
