import { useMemo, useReducer } from "react"
import { buildCatalogModel } from "../lib/catalog-model"
import type { DashboardProjectModel } from "../lib/project-model"
import {
  createInitialDashboardSelection,
  dashboardSelectionReducer,
} from "../lib/selection"
import { CatalogPanel } from "./CatalogPanel"
import { GraphPanel } from "./GraphPanel"
import { SelectionDetails } from "./SelectionDetails"

export interface DashboardWorkspaceProps {
  projectModel: DashboardProjectModel
}

export function DashboardWorkspace({ projectModel }: DashboardWorkspaceProps) {
  const catalog = useMemo(() => buildCatalogModel(projectModel), [projectModel])
  const [selection, dispatch] = useReducer(
    dashboardSelectionReducer,
    undefined,
    createInitialDashboardSelection
  )
  const selectedGraphId = selection.kind === "graph" ? selection.id : null

  return (
    <section style={styles.workspace}>
      <CatalogPanel catalog={catalog} selection={selection} onSelect={dispatch} />
      <GraphPanel graphId={selectedGraphId} projectModel={projectModel} />
      <SelectionDetails catalog={catalog} projectModel={projectModel} selection={selection} />
    </section>
  )
}

const styles = {
  workspace: {
    display: "grid",
    gap: "18px",
    gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr) minmax(260px, 320px)",
    alignItems: "start",
  },
} as const
