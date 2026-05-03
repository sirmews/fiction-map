import { StoryGraphCanvasWithProvider } from "@fiction-map/visualize"
import type { GraphAnnotation } from "@fiction-map/visualize"
import { buildGraphCanvasModel } from "../lib/graph-canvas-model"
import type { DashboardProjectModel } from "../lib/project-model"

export interface GraphPanelProps {
  graphId: string | null
  projectModel: DashboardProjectModel
}

export function GraphPanel({ graphId, projectModel }: GraphPanelProps) {
  if (!graphId) {
    return (
      <section style={styles.panel}>
        <p style={styles.kicker}>Topology</p>
        <h2 style={styles.title}>Graph canvas</h2>
        <p style={styles.empty}>Select a graph from the catalog to inspect its topology.</p>
      </section>
    )
  }

  const canvasModel = buildGraphCanvasModel(projectModel, graphId)
  if (!canvasModel) {
    return (
      <section style={styles.panel}>
        <p style={styles.kicker}>Topology</p>
        <h2 style={styles.title}>Graph canvas</h2>
        <p style={styles.empty}>The selected graph is no longer available in the current snapshot.</p>
      </section>
    )
  }

  const annotations: GraphAnnotation[] = canvasModel.nodeAnnotations
  const canRenderInteractiveCanvas =
    typeof window !== "undefined" && typeof window.ResizeObserver !== "undefined"

  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Topology</p>
          <h2 style={styles.title}>{canvasModel.graphName} topology</h2>
        </div>
        <p style={styles.caption}>
          {canvasModel.nodes.length} nodes, {canvasModel.edges.length} edges
        </p>
      </div>

      <div style={styles.legend}>
        {canvasModel.nodes.map((node) => (
          <span key={node.id} style={styles.legendChip}>
            {node.label}
          </span>
        ))}
      </div>

      {canRenderInteractiveCanvas ? (
        <div style={styles.canvasFrame}>
          <StoryGraphCanvasWithProvider
            nodes={canvasModel.nodes.map((node) => ({
              id: node.id,
              type: "default",
              position: { x: 0, y: 0 },
              data: {
                title: node.label,
                type: node.nodeTypeId,
              },
            }))}
            edges={canvasModel.edges.map((edge) => ({
              id: edge.id,
              source: edge.source,
              target: edge.target,
              label: edge.label,
            }))}
            annotations={annotations}
            autoLayout
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            style={styles.canvas}
          />
        </div>
      ) : (
        <p style={styles.empty}>
          Interactive graph rendering is unavailable in this environment, but the selected graph data is loaded.
        </p>
      )}
    </section>
  )
}

const styles = {
  panel: {
    display: "grid",
    gap: "16px",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.92)",
    minHeight: "520px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
  kicker: {
    margin: "0 0 6px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    color: "#8b6a35",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#241b11",
  },
  caption: {
    margin: 0,
    color: "#695944",
  },
  legend: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap" as const,
  },
  legendChip: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "rgba(29, 92, 67, 0.08)",
    color: "#234534",
    fontSize: "13px",
  },
  canvasFrame: {
    minHeight: "380px",
    borderRadius: "16px",
    overflow: "hidden" as const,
    border: "1px solid rgba(28, 26, 23, 0.08)",
    background: "#f8f3ea",
  },
  canvas: {
    height: "100%",
    minHeight: "380px",
  },
  empty: {
    margin: 0,
    color: "#544737",
    lineHeight: 1.6,
  },
} as const
