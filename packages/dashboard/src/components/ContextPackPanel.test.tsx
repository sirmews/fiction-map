import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"
import { ContextPackPanel } from "./ContextPackPanel"
import type { ContextPack } from "../lib/context-packs"

const projectSummaryPack: ContextPack = {
  id: "project-summary",
  title: "Fiction Map Project Summary",
  audience: "both",
  intent: "orientation",
  scope: "project",
  kind: "project-summary",
  summary: "A bounded architecture summary for the whole project.",
  purpose: "Use this pack to understand the repository and where to read next.",
  systemView: [
    "packages/cli is the user-facing entrypoint.",
    "packages/dev-server owns long-lived runtime state.",
  ],
  keyConcepts: [
    {
      name: "generated metadata",
      explanation: "Structured project facts used by the dashboard.",
    },
  ],
  evidence: [
    {
      kind: "doc",
      label: "North Star",
      path: "docs/NORTH_STAR.md",
      reason: "Captures the intended product direction.",
      priority: 1,
    },
  ],
  nextLook: [
    {
      kind: "code",
      label: "Dev server state",
      path: "packages/dev-server/src/state.ts",
      reason: "Defines refresh semantics.",
      focus: "Look at refresh versus queue semantics.",
      priority: 1,
    },
  ],
  implementationStatus: ["Dashboard app package and metadata shell are implemented."],
  contextBlock: "Title: Fiction Map Project Summary\nSummary:\nA bounded architecture summary.",
  promptSeed: "Read docs/NORTH_STAR.md and explain the package boundaries.",
  cautions: ["This pack is a starting point, not a repository dump."],
}

describe("ContextPackPanel", () => {
  test("renders packs and exposes prompt/context copy actions", () => {
    const onCopy = vi.fn()

    render(<ContextPackPanel packs={[projectSummaryPack]} onCopy={onCopy} />)

    expect(screen.getByText("Fiction Map Project Summary")).toBeTruthy()
    expect(
      screen.getByText("A bounded architecture summary for the whole project.")
    ).toBeTruthy()
    expect(screen.getByText("North Star")).toBeTruthy()
    expect(screen.getByText("Dev server state")).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: "Copy Prompt Seed" }))
    fireEvent.click(screen.getByRole("button", { name: "Copy Full Context Pack" }))

    expect(onCopy).toHaveBeenNthCalledWith(1, projectSummaryPack.promptSeed)
    expect(onCopy).toHaveBeenNthCalledWith(2, projectSummaryPack.contextBlock)
  })
})
