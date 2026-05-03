import type { DashboardCatalogModel } from "../lib/catalog-model"
import type { DashboardProjectModel } from "../lib/project-model"
import type { DashboardSelection } from "../lib/selection"

export interface SelectionDetailsProps {
  catalog: DashboardCatalogModel
  projectModel: DashboardProjectModel
  selection: DashboardSelection
}

export function SelectionDetails({
  catalog,
  projectModel,
  selection,
}: SelectionDetailsProps) {
  const content = describeSelection(selection, projectModel, catalog)

  return (
    <section style={styles.panel}>
      <div>
        <p style={styles.kicker}>Details</p>
        <h2 style={styles.title}>Current selection</h2>
      </div>
      <p style={styles.identity}>{content.identity}</p>
      <ul style={styles.list}>
        {content.lines.map((line) => (
          <li key={line} style={styles.listItem}>
            {line}
          </li>
        ))}
      </ul>
    </section>
  )
}

function describeSelection(
  selection: DashboardSelection,
  projectModel: DashboardProjectModel,
  catalog: DashboardCatalogModel
): { identity: string; lines: string[] } {
  switch (selection.kind) {
    case "project":
      return {
        identity: "project",
        lines: [
          `${catalog.summary.graphs} graphs`,
          `${catalog.summary.nodeTypes} node types`,
          `${projectModel.project.validationCounts.errors} project validation errors`,
          `${projectModel.project.validationCounts.warnings} project validation warnings`,
        ],
      }
    case "graph": {
      const graph = projectModel.catalogs.graphById[selection.id]
      if (!graph) {
        return { identity: `graph: ${selection.id}`, lines: ["Graph is unavailable in this snapshot."] }
      }

      return {
        identity: `graph: ${graph.id}`,
        lines: [
          `${graph.nodeCount} nodes`,
          `${graph.edgeCount} edges`,
          `${graph.usedNodeTypeIds.length} node types used`,
          `${graph.usedEdgeTypeIds.length} edge types used`,
          `${graph.errors.length} graph errors, ${graph.warnings.length} graph warnings`,
        ],
      }
    }
    case "node-type": {
      const nodeType = catalog.nodeTypes.find((entry) => entry.id === selection.id)
      return {
        identity: `node-type: ${selection.id}`,
        lines: nodeType
          ? [
              `${nodeType.usedByGraphIds.length} graphs use this type`,
              `${nodeType.outgoingEdgeTypeIds.length} outgoing edge types`,
              `${nodeType.incomingEdgeTypeIds.length} incoming edge types`,
            ]
          : ["Node type is unavailable in this snapshot."],
      }
    }
    case "edge-type": {
      const edgeType = catalog.edgeTypes.find((entry) => entry.id === selection.id)
      return {
        identity: `edge-type: ${selection.id}`,
        lines: edgeType
          ? [
              `${edgeType.usedByGraphIds.length} graphs use this type`,
              `${edgeType.sourceNodeTypeIds.length} source node types`,
              `${edgeType.targetNodeTypeIds.length} target node types`,
            ]
          : ["Edge type is unavailable in this snapshot."],
      }
    }
    case "condition": {
      const condition = catalog.conditions.find((entry) => entry.id === selection.id)
      return {
        identity: `condition: ${selection.id}`,
        lines: condition
          ? [`${condition.usedByGraphIds.length} graphs use this condition`]
          : ["Condition is unavailable in this snapshot."],
      }
    }
    case "effect": {
      const effect = catalog.effects.find((entry) => entry.id === selection.id)
      return {
        identity: `effect: ${selection.id}`,
        lines: effect
          ? [`${effect.usedByGraphIds.length} graphs use this effect`]
          : ["Effect is unavailable in this snapshot."],
      }
    }
    case "validation-issue":
      return {
        identity: `validation-issue: ${selection.id}`,
        lines: ["Validation issue details are not yet rendered in this slice."],
      }
  }
}

const styles = {
  panel: {
    display: "grid",
    gap: "14px",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.92)",
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
  identity: {
    margin: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    color: "#3d3326",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "8px",
  },
  listItem: {
    color: "#4b4030",
    lineHeight: 1.5,
  },
} as const
