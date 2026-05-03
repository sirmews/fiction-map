import { useMemo } from "react"
import { DashboardWorkspace } from "./components/DashboardWorkspace"
import { ContextPackPanel } from "./components/ContextPackPanel"
import { useMetadata } from "./hooks/useMetadata"
import { buildPrimaryContextPacks } from "./lib/context-packs"
import { deriveDashboardMetadataFacts } from "./lib/metadata"
import { buildDashboardProjectModel } from "./lib/project-model"
import type { DevServerRpcClient } from "./lib/rpc-client"

export function App(props: { client?: DevServerRpcClient }) {
  const {
    connectionState,
    error,
    isLoading,
    isRefreshing,
    lastNotification,
    metadataAvailable,
    refresh,
    refreshError,
    snapshot,
  } = useMetadata(props.client)
  const projectModel = useMemo(() => buildDashboardProjectModel(snapshot), [snapshot])
  const packs = buildPrimaryContextPacks(deriveDashboardMetadataFacts(snapshot))

  return (
    <main style={styles.page}>
      <section style={styles.hero}>
        <div>
          <p style={styles.kicker}>Fiction Map Dashboard</p>
          <h1 style={styles.title}>Architecture context dashboard</h1>
          <p style={styles.subtitle}>
            This first slice turns the live metadata path into copyable architecture
            context for humans and LLMs, without pretending the broader dashboard is
            complete yet.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={connectionState !== "connected" || isRefreshing}
          style={{
            ...styles.button,
            ...(connectionState !== "connected" || isRefreshing ? styles.buttonDisabled : {}),
          }}
        >
          {isRefreshing ? "Refreshing..." : "Refresh metadata"}
        </button>
      </section>

      <section style={styles.grid}>
        <StatusCard
          label="Connection"
          value={connectionState}
          tone={
            connectionState === "connected"
              ? "ready"
              : connectionState === "connecting"
                ? "pending"
                : "error"
          }
          detail={
            connectionState === "connected"
              ? "Live JSON-RPC connection to the dev server is up."
              : connectionState === "connecting"
                ? "Waiting for the dashboard to connect."
                : "The dashboard is offline and will wait for reconnect."
          }
        />
        <StatusCard
          label="Load State"
          value={isLoading ? "loading" : error ? "error" : "ready"}
          tone={isLoading ? "pending" : error ? "error" : "ready"}
          detail={
            isLoading
              ? "Fetching the current metadata snapshot."
              : error
                ? error
                : "The latest metadata snapshot has been loaded."
          }
        />
        <StatusCard
          label="Metadata"
          value={metadataAvailable ? "available" : "unavailable"}
          tone={metadataAvailable ? "ready" : "pending"}
          detail={
            metadataAvailable
              ? "The server currently has metadata ready for dashboard surfaces."
              : "No metadata snapshot is currently available."
          }
        />
      </section>

      <section style={styles.panel}>
        <div style={styles.panelHeader}>
          <h2 style={styles.panelTitle}>Metadata status</h2>
        </div>
        <dl style={styles.definitionList}>
          <StatusRow
            term="Last refresh"
            description={formatTimestamp(snapshot?.lastRefreshAt ?? null)}
          />
          <StatusRow
            term="Server refresh error"
            description={snapshot?.refreshError?.message ?? "None"}
          />
          <StatusRow
            term="Manual refresh error"
            description={refreshError ?? "None"}
          />
          <StatusRow
            term="Last change notification"
            description={
              lastNotification
                ? `${lastNotification.reason} at ${formatTimestamp(lastNotification.refreshedAt)}`
                : "No notifications received yet"
            }
          />
          <StatusRow
            term="Current snapshot counts"
            description={formatMetadataCounts(snapshot)}
          />
        </dl>
      </section>

      {projectModel.snapshot.metadataAvailable ? (
        <DashboardWorkspace projectModel={projectModel} />
      ) : null}

      <ContextPackPanel packs={packs} />
    </main>
  )
}

function StatusCard(props: {
  detail: string
  label: string
  tone: "error" | "pending" | "ready"
  value: string
}) {
  return (
    <article style={styles.card}>
      <p style={styles.cardLabel}>{props.label}</p>
      <p style={{ ...styles.cardValue, ...toneStyles[props.tone] }}>{props.value}</p>
      <p style={styles.cardDetail}>{props.detail}</p>
    </article>
  )
}

function StatusRow(props: { description: string; term: string }) {
  return (
    <>
      <dt style={styles.term}>{props.term}</dt>
      <dd style={styles.description}>{props.description}</dd>
    </>
  )
}

function formatMetadataCounts(snapshot: ReturnType<typeof useMetadata>["snapshot"]): string {
  if (!snapshot?.metadata) {
    return "No metadata loaded"
  }

  const { conditions, edgeTypes, effects, graphs, nodeTypes } = snapshot.metadata
  return [
    `${graphs.length} graphs`,
    `${nodeTypes.length} node types`,
    `${edgeTypes.length} edge types`,
    `${conditions.length} conditions`,
    `${effects.length} effects`,
  ].join(", ")
}

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "Never"
  }

  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(date)
}

const toneStyles = {
  error: { color: "#9f1d1d" },
  pending: { color: "#8a5a00" },
  ready: { color: "#12643a" },
} as const

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px",
    background:
      "radial-gradient(circle at top left, rgba(197, 174, 130, 0.28), transparent 32%), linear-gradient(180deg, #f7f4ec 0%, #efe8d8 100%)",
  },
  hero: {
    display: "flex",
    gap: "16px",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    padding: "24px",
    borderRadius: "20px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.84)",
  },
  kicker: {
    margin: "0 0 8px",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    fontSize: "12px",
    color: "#7b5e2d",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "32px",
    lineHeight: "1.1",
  },
  subtitle: {
    margin: 0,
    maxWidth: "720px",
    lineHeight: 1.5,
    color: "#4a443b",
  },
  button: {
    border: "none",
    borderRadius: "999px",
    padding: "12px 18px",
    background: "#1d5c43",
    color: "#fffdf9",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  buttonDisabled: {
    background: "#a7a099",
    cursor: "not-allowed",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  card: {
    padding: "18px",
    borderRadius: "18px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.82)",
  },
  cardLabel: {
    margin: "0 0 8px",
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#6a635b",
  },
  cardValue: {
    margin: "0 0 8px",
    fontSize: "24px",
    fontWeight: 700,
    textTransform: "capitalize",
  },
  cardDetail: {
    margin: 0,
    lineHeight: 1.5,
    color: "#4a443b",
  },
  panel: {
    marginBottom: "24px",
    padding: "22px",
    borderRadius: "20px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.84)",
  },
  panelHeader: {
    marginBottom: "16px",
  },
  panelTitle: {
    margin: 0,
    fontSize: "20px",
  },
  definitionList: {
    margin: 0,
    display: "grid",
    gridTemplateColumns: "minmax(180px, 220px) 1fr",
    rowGap: "12px",
    columnGap: "16px",
  },
  term: {
    margin: 0,
    fontWeight: 600,
  },
  description: {
    margin: 0,
    color: "#4a443b",
  },
} as const
