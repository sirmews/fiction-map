export type DashboardSelection =
  | { kind: "project" }
  | { kind: "graph"; id: string }
  | { kind: "node-type"; id: string }
  | { kind: "edge-type"; id: string }
  | { kind: "condition"; id: string }
  | { kind: "effect"; id: string }
  | { kind: "validation-issue"; id: string }

export type DashboardSelectionAction =
  | { type: "select-project" }
  | { type: "select-graph"; id: string }
  | { type: "select-node-type"; id: string }
  | { type: "select-edge-type"; id: string }
  | { type: "select-condition"; id: string }
  | { type: "select-effect"; id: string }
  | { type: "select-validation-issue"; id: string }

export function createInitialDashboardSelection(): DashboardSelection {
  return { kind: "project" }
}

export function dashboardSelectionReducer(
  _selection: DashboardSelection,
  action: DashboardSelectionAction
): DashboardSelection {
  switch (action.type) {
    case "select-project":
      return { kind: "project" }
    case "select-graph":
      return { kind: "graph", id: action.id }
    case "select-node-type":
      return { kind: "node-type", id: action.id }
    case "select-edge-type":
      return { kind: "edge-type", id: action.id }
    case "select-condition":
      return { kind: "condition", id: action.id }
    case "select-effect":
      return { kind: "effect", id: action.id }
    case "select-validation-issue":
      return { kind: "validation-issue", id: action.id }
  }
}
