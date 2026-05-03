import { formatDefinitionCounts, type DashboardMetadataFacts } from "./metadata"
import {
  getCuratedSourcesForPack,
  type ContextPackKind,
  type CuratedSourceKind,
} from "./curated-sources"

export interface ContextPackConcept {
  explanation: string
  name: string
}

export interface ContextPackReference {
  focus?: string
  kind: CuratedSourceKind
  label: string
  path: string
  priority: number
  reason: string
}

export interface ContextPack {
  audience: "human" | "llm" | "both"
  cautions?: string[]
  contextBlock: string
  evidence: ContextPackReference[]
  id: string
  implementationStatus?: string[]
  intent: "orientation" | "explanation" | "planning" | "implementation"
  keyConcepts: ContextPackConcept[]
  kind: ContextPackKind
  nextLook: ContextPackReference[]
  promptSeed: string
  purpose: string
  scope: "project" | "subsystem" | "selection"
  summary: string
  systemView: string[]
  title: string
}

export function buildPrimaryContextPacks(
  facts: DashboardMetadataFacts
): [ContextPack, ContextPack] {
  return [buildProjectSummaryPack(facts), buildDevRuntimePack(facts)]
}

export function buildProjectSummaryPack(facts: DashboardMetadataFacts): ContextPack {
  const summary =
    "Fiction Map defines graph-based systems in code and surfaces their structure through generated metadata, a live dev server, and a dashboard that now prioritizes architecture legibility over code navigation."
  const systemView = [
    "`packages/cli` remains the user-facing entrypoint for generation and future `fiction-map dev` orchestration.",
    "`packages/dev-server` owns long-lived metadata state, watcher invalidation, RPC, and WebSocket transport.",
    "Generated metadata is the bridge between handwritten graph definitions and dashboard-readable architecture context.",
    "The dashboard direction is explicitly about helping humans and LLMs understand the platform, not about click-to-code first.",
    `The current live snapshot exposes ${formatDefinitionCounts(facts.counts)}.`,
  ]
  const keyConcepts = [
    {
      name: "generated metadata",
      explanation:
        "Structured project information derived from graph definitions and used as the dashboard's primary live input.",
    },
    {
      name: "dev server",
      explanation:
        "The long-lived local process that owns refresh state, invalidation, transport, and client notifications.",
    },
    {
      name: "dashboard legibility",
      explanation:
        "The product goal of making architecture and mechanics understandable before someone has to inspect code directly.",
    },
    {
      name: "context pack",
      explanation:
        "A bounded, provenance-backed context bundle that summarizes a subsystem and points to the right next files or docs.",
    },
  ]
  const evidence = [
    toMetadataEvidence(facts, 1),
    ...getCuratedSourcesForPack("project-summary").slice(0, 5).map(toReference),
  ]
  const nextLook = getCuratedSourcesForPack("project-summary")
    .filter((source) => source.focus)
    .slice(0, 4)
    .map(toReference)
  const implementationStatus = [
    "Generator reuse is implemented.",
    "Dev-server config, state, RPC, server, and watcher are implemented.",
    "Dashboard app package and metadata shell are implemented.",
    "Context-pack generation is not implemented yet.",
    "Editor integration is deferred rather than a current milestone requirement.",
  ]
  const promptSeed = [
    "You are reviewing Fiction Map at the architecture level.",
    "",
    "Start by reading:",
    "- docs/NORTH_STAR.md",
    "- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
    "- packages/dev-server/src/state.ts",
    "- packages/dev-server/src/server.ts",
    "",
    "Then produce a concise summary that explains the package boundaries, metadata flow, and what is already implemented versus still pending.",
    "",
    "Do not summarize the whole repository exhaustively.",
  ].join("\n")

  return {
    audience: "both",
    cautions: [
      "This pack is a starting point, not a complete repository export.",
      "It is optimized for orientation rather than detailed implementation guidance.",
    ],
    contextBlock: renderContextBlock({
      title: "Fiction Map Project Summary",
      purpose:
        "Use this pack to understand what the repository does, how the main packages are divided, and where to inspect next.",
      summary,
      systemView,
      keyConcepts,
      evidence,
      nextLook,
      implementationStatus,
      facts,
    }),
    evidence,
    id: "project-summary",
    implementationStatus,
    intent: "orientation",
    keyConcepts,
    kind: "project-summary",
    nextLook,
    promptSeed,
    purpose:
      "Use this pack when you need a high-level understanding of what the repository does and where to start reading next.",
    scope: "project",
    summary,
    systemView,
    title: "Fiction Map Project Summary",
  }
}

export function buildDevRuntimePack(facts: DashboardMetadataFacts): ContextPack {
  const summary =
    "Fiction Map's current dev runtime is the local path from generated metadata to a live dashboard shell. Generator reuse, dev-server state, watcher invalidation, JSON-RPC, and transport are real, while richer dashboard content and CLI orchestration are still being built."
  const systemView = [
    "`packages/cli` should own command orchestration, but long-lived runtime state should not live there.",
    "`packages/dev-server/src/state.ts` owns current metadata, refresh lifecycle, queued invalidation, and last-good-state behavior.",
    "`packages/dev-server/src/server.ts` owns HTTP health, WebSocket transport, and metadata-changed broadcasts.",
    "`packages/dev-server/src/watcher.ts` converts supported filesystem changes into debounced invalidation events.",
    "The dashboard shell exists already, but the architecture-facing pack content and end-to-end CLI command are still incomplete.",
  ]
  const keyConcepts = [
    {
      name: "refresh versus queued refresh",
      explanation:
        "Manual refresh joins or starts the active cycle, while watcher invalidation queues a follow-up cycle if work is already in flight.",
    },
    {
      name: "last good metadata",
      explanation:
        "A failed refresh does not erase the previous valid snapshot; the error is surfaced while the last good state remains available.",
    },
    {
      name: "JSON-RPC contract",
      explanation:
        "The dashboard talks to the server through typed metadata, graph, refresh, and notification messages.",
    },
    {
      name: "watcher filtering",
      explanation:
        "Only supported graph-definition file types trigger debounced refresh behavior while build and generated paths stay ignored.",
    },
  ]
  const evidence = [
    toMetadataEvidence(facts, 1),
    ...getCuratedSourcesForPack("dev-runtime").slice(0, 5).map(toReference),
  ]
  const nextLook = getCuratedSourcesForPack("dev-runtime")
    .filter((source) => source.focus)
    .slice(0, 5)
    .map(toReference)
  const implementationStatus = [
    "Generator reuse for in-process metadata refresh is implemented.",
    "Dev-server config, state, watcher, RPC, and server transport are implemented.",
    "Dashboard app package and metadata shell are implemented.",
    "The CLI does not yet provide a real `fiction-map dev` command.",
    "Context packs are defined in planning docs only, not in code.",
  ]
  const promptSeed = [
    "You are reviewing Fiction Map's dev runtime.",
    "",
    "Start by reading:",
    "- packages/dev-server/src/state.ts",
    "- packages/dev-server/src/server.ts",
    "- packages/dev-server/src/watcher.ts",
    "- packages/dev-server/src/protocol.ts",
    "- docs/plans/2026-05-03-milestone-4-dashboard-implementation-plan.md",
    "",
    "Then explain how refresh lifecycle works, how watcher invalidation reaches clients, and what still remains for a complete `fiction-map dev` workflow.",
  ].join("\n")

  return {
    audience: "both",
    cautions: [
      "This pack explains the runtime boundary, not the full future dashboard surface.",
      "CLI orchestration is still pending even though the transport and shell are real.",
    ],
    contextBlock: renderContextBlock({
      title: "Fiction Map Dev Runtime",
      purpose:
        "Use this pack to understand how live metadata refresh, server state, watcher invalidation, and dashboard transport fit together.",
      summary,
      systemView,
      keyConcepts,
      evidence,
      nextLook,
      implementationStatus,
      facts,
    }),
    evidence,
    id: "dev-runtime",
    implementationStatus,
    intent: "orientation",
    keyConcepts,
    kind: "dev-runtime",
    nextLook,
    promptSeed,
    purpose:
      "Use this pack when you need to understand how live metadata refresh and dashboard transport fit together.",
    scope: "subsystem",
    summary,
    systemView,
    title: "Fiction Map Dev Runtime",
  }
}

function renderContextBlock(input: {
  evidence: ContextPackReference[]
  facts: DashboardMetadataFacts
  implementationStatus: string[]
  keyConcepts: ContextPackConcept[]
  nextLook: ContextPackReference[]
  purpose: string
  summary: string
  systemView: string[]
  title: string
}): string {
  const refreshError = input.facts.refreshErrorMessage ?? "none"

  return [
    `Title: ${input.title}`,
    `Purpose: ${input.purpose}`,
    "Intent: orientation",
    "",
    "Summary:",
    input.summary,
    "",
    "System View:",
    ...input.systemView.map((entry) => `- ${stripTicks(entry)}`),
    "",
    "Key Concepts:",
    ...input.keyConcepts.map((concept) => `- ${concept.name}: ${concept.explanation}`),
    "",
    "Current Metadata Snapshot:",
    `- Metadata available: ${input.facts.metadataAvailable ? "yes" : "no"}`,
    `- Definition counts: ${formatDefinitionCounts(input.facts.counts)}`,
    `- Validation counts: ${input.facts.validationCounts.errors} errors, ${input.facts.validationCounts.warnings} warnings`,
    `- Last refresh: ${input.facts.lastRefreshAt ?? "never"}`,
    `- Current refresh error: ${refreshError}`,
    "",
    "Current Implementation Status:",
    ...input.implementationStatus.map((entry) => `- ${entry}`),
    "",
    "Evidence:",
    ...input.evidence.map((entry) => `- ${entry.path} — ${entry.reason}`),
    "",
    "Inspect Next:",
    ...input.nextLook.map(
      (entry) => `- ${entry.path} — ${entry.focus ?? entry.reason}`
    ),
  ].join("\n")
}

function stripTicks(value: string): string {
  return value.replaceAll("`", "")
}

function toMetadataEvidence(
  facts: DashboardMetadataFacts,
  priority: number
): ContextPackReference {
  return {
    kind: "metadata",
    label: "Current metadata snapshot",
    path: "live-metadata://snapshot",
    priority,
    reason: `Current snapshot contains ${formatDefinitionCounts(facts.counts)} with ${facts.validationCounts.errors} errors and ${facts.validationCounts.warnings} warnings.`,
  }
}

function toReference(source: {
  focus?: string
  kind: CuratedSourceKind
  label: string
  path: string
  priority: number
  reason: string
}): ContextPackReference {
  return {
    focus: source.focus,
    kind: source.kind,
    label: source.label,
    path: source.path,
    priority: source.priority,
    reason: source.reason,
  }
}
