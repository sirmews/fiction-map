import { describe, expect, test } from "vitest"
import {
  createInitialDashboardSelection,
  dashboardSelectionReducer,
} from "./selection"

describe("dashboardSelectionReducer", () => {
  test("starts at the project-level selection", () => {
    expect(createInitialDashboardSelection()).toEqual({ kind: "project" })
  })

  test("switches cleanly between graph and definition selections", () => {
    let selection = createInitialDashboardSelection()

    selection = dashboardSelectionReducer(selection, {
      type: "select-graph",
      id: "story",
    })
    expect(selection).toEqual({ kind: "graph", id: "story" })

    selection = dashboardSelectionReducer(selection, {
      type: "select-node-type",
      id: "scene",
    })
    expect(selection).toEqual({ kind: "node-type", id: "scene" })

    selection = dashboardSelectionReducer(selection, {
      type: "select-edge-type",
      id: "choice",
    })
    expect(selection).toEqual({ kind: "edge-type", id: "choice" })
  })

  test("supports condition, effect, and validation issue selection", () => {
    let selection = createInitialDashboardSelection()

    selection = dashboardSelectionReducer(selection, {
      type: "select-condition",
      id: "has-key",
    })
    expect(selection).toEqual({ kind: "condition", id: "has-key" })

    selection = dashboardSelectionReducer(selection, {
      type: "select-effect",
      id: "gain-key",
    })
    expect(selection).toEqual({ kind: "effect", id: "gain-key" })

    selection = dashboardSelectionReducer(selection, {
      type: "select-validation-issue",
      id: "issue-1",
    })
    expect(selection).toEqual({ kind: "validation-issue", id: "issue-1" })
  })
})
