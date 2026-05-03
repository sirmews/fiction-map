import type { DashboardCatalogModel } from "../lib/catalog-model"
import type { DashboardSelection, DashboardSelectionAction } from "../lib/selection"

export interface CatalogPanelProps {
  catalog: DashboardCatalogModel
  onSelect(action: DashboardSelectionAction): void
  selection: DashboardSelection
}

export function CatalogPanel({ catalog, onSelect, selection }: CatalogPanelProps) {
  return (
    <section style={styles.panel}>
      <div>
        <p style={styles.kicker}>Catalog</p>
        <h2 style={styles.title}>Definitions and graphs</h2>
      </div>

      <CatalogSection
        title={`Graphs (${catalog.summary.graphs})`}
        items={catalog.graphs.map((graph) => ({
          id: graph.id,
          label: graph.name,
          detail: `${graph.nodeCount} nodes, ${graph.edgeCount} edges`,
          selected: selection.kind === "graph" && selection.id === graph.id,
          onClick: () => onSelect({ type: "select-graph", id: graph.id }),
        }))}
      />

      <CatalogSection
        title={`Node Types (${catalog.summary.nodeTypes})`}
        items={catalog.nodeTypes.map((nodeType) => ({
          id: nodeType.id,
          label: nodeType.name,
          detail: `${nodeType.usedByGraphIds.length} graphs`,
          selected: selection.kind === "node-type" && selection.id === nodeType.id,
          onClick: () => onSelect({ type: "select-node-type", id: nodeType.id }),
        }))}
      />

      <CatalogSection
        title={`Edge Types (${catalog.summary.edgeTypes})`}
        items={catalog.edgeTypes.map((edgeType) => ({
          id: edgeType.id,
          label: edgeType.name,
          detail: `${edgeType.usedByGraphIds.length} graphs`,
          selected: selection.kind === "edge-type" && selection.id === edgeType.id,
          onClick: () => onSelect({ type: "select-edge-type", id: edgeType.id }),
        }))}
      />

      <CatalogSection
        title={`Conditions (${catalog.summary.conditions})`}
        items={catalog.conditions.map((condition) => ({
          id: condition.id,
          label: condition.name,
          detail: `${condition.usedByGraphIds.length} graphs`,
          selected: selection.kind === "condition" && selection.id === condition.id,
          onClick: () => onSelect({ type: "select-condition", id: condition.id }),
        }))}
      />

      <CatalogSection
        title={`Effects (${catalog.summary.effects})`}
        items={catalog.effects.map((effect) => ({
          id: effect.id,
          label: effect.name,
          detail: `${effect.usedByGraphIds.length} graphs`,
          selected: selection.kind === "effect" && selection.id === effect.id,
          onClick: () => onSelect({ type: "select-effect", id: effect.id }),
        }))}
      />
    </section>
  )
}

function CatalogSection(props: {
  items: Array<{
    id: string
    label: string
    detail: string
    selected: boolean
    onClick(): void
  }>
  title: string
}) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{props.title}</h3>
      <div style={styles.itemList}>
        {props.items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            style={{
              ...styles.item,
              ...(item.selected ? styles.itemSelected : {}),
            }}
          >
            <strong>{item.label}</strong>
            <span style={styles.itemDetail}>{item.detail}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

const styles = {
  kicker: {
    margin: "0 0 6px",
    textTransform: "uppercase",
    letterSpacing: "0.12em",
    fontSize: "12px",
    color: "#8b6a35",
  },
  panel: {
    display: "grid",
    gap: "18px",
    padding: "20px",
    borderRadius: "20px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.92)",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    color: "#241b11",
  },
  section: {
    display: "grid",
    gap: "10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "13px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7a6240",
  },
  itemList: {
    display: "grid",
    gap: "8px",
  },
  item: {
    appearance: "none",
    textAlign: "left" as const,
    display: "grid",
    gap: "4px",
    border: "1px solid rgba(28, 26, 23, 0.1)",
    borderRadius: "14px",
    padding: "12px 14px",
    background: "#fffdf8",
    color: "#2f2417",
    cursor: "pointer",
  },
  itemSelected: {
    border: "1px solid rgba(29, 92, 67, 0.4)",
    background: "rgba(29, 92, 67, 0.08)",
  },
  itemDetail: {
    color: "#695944",
    fontSize: "13px",
  },
} as const
