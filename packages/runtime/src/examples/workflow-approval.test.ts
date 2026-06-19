import { defineEdgeType, defineGraph, defineNodeType } from "@fiction-map/core"
import { defineEntityType, defineWorld, EntityRegistry } from "@fiction-map/entities"
import { describe, expect, it } from "vitest"
import { createInitialState, createRuntimeFromGraph, deriveEntityState } from "../index"

/**
 * A Workflow/Business Logic Example.
 * Demonstrates using Fiction Map to model a document approval process.
 * Entities represent Roles/Users. Graph nodes represent document states.
 */
describe("Example: Workflow Approval", () => {
  it("executes a document approval state machine using roles", () => {
    const registry = new EntityRegistry()

    // 1. Define Schemas
    defineNodeType(registry, {
      id: "state",
      properties: {
        statusName: { type: "string", required: true },
      },
    })

    defineEdgeType(registry, {
      id: "action",
      properties: {
        buttonLabel: { type: "string", required: true },
      },
      sourceTypes: ["state"],
      targetTypes: ["state"],
    })

    defineEntityType(registry, {
      id: "role",
      properties: {
        name: { type: "string", required: true },
      },
    })

    defineEntityType(registry, {
      id: "user",
      properties: {
        name: { type: "string", required: true },
      },
      references: {
        roles: { to: ["role"], multiple: true },
      },
    })

    // 2. Define the World (The Organization)
    const org = defineWorld(registry, {
      id: "acme-corp",
      entities: [
        { id: "role-author", type: "role", name: "Author" },
        { id: "role-reviewer", type: "role", name: "Reviewer" },
        {
          id: "user-alice",
          type: "user",
          name: "Alice",
          references: { roles: ["role-author"] },
          unlocks: ["role-author"],
        },
        {
          id: "user-bob",
          type: "user",
          name: "Bob",
          references: { roles: ["role-reviewer"] },
          unlocks: ["role-reviewer"],
        },
      ],
    })

    // 3. Define the Workflow Graph
    const workflow = defineGraph(registry, {
      id: "document-lifecycle",
      startNode: "draft",
      nodes: [
        { id: "draft", type: "state", properties: { statusName: "Draft" } },
        { id: "in-review", type: "state", properties: { statusName: "In Review" } },
        { id: "approved", type: "state", properties: { statusName: "Approved" } },
        { id: "rejected", type: "state", properties: { statusName: "Rejected" } },
      ],
      edges: [
        {
          id: "submit",
          type: "action",
          source: "draft",
          target: "in-review",
          properties: { buttonLabel: "Submit for Review" },
          conditions: [{ type: "entityUnlocked", entityId: "role-author" }],
        },
        {
          id: "approve",
          type: "action",
          source: "in-review",
          target: "approved",
          properties: { buttonLabel: "Approve" },
          conditions: [{ type: "entityUnlocked", entityId: "role-reviewer" }],
        },
        {
          id: "reject",
          type: "action",
          source: "in-review",
          target: "rejected",
          properties: { buttonLabel: "Reject" },
          conditions: [{ type: "entityUnlocked", entityId: "role-reviewer" }],
        },
        {
          id: "revise",
          type: "action",
          source: "rejected",
          target: "draft",
          properties: { buttonLabel: "Revise Document" },
          conditions: [{ type: "entityUnlocked", entityId: "role-author" }],
        },
      ],
    })

    const runtime = createRuntimeFromGraph(workflow)

    // Simulate Alice (Author) logging in and acting
    let state = createInitialState(
      runtime.parsed.startNodeId,
      {},
      {},
      {
        owned: new Set(["user-alice"]),
        active: new Set(["user-alice"]),
        unlocked: new Set(),
        resources: {},
      },
    )

    let context = { derivedState: deriveEntityState(org, state) }

    expect(state.currentNodeId).toBe("draft")
    let available = runtime.getAvailable(state, context)
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe("submit")

    // Alice submits the document
    let result = runtime.step(state, available[0], context)
    state = result.state
    expect(state.currentNodeId).toBe("in-review")

    // Alice tries to approve her own document - should fail because she isn't a reviewer
    context = { derivedState: deriveEntityState(org, state) }
    available = runtime.getAvailable(state, context)
    expect(available).toHaveLength(0) // No actions available for Alice

    // Simulate Bob (Reviewer) logging in instead
    state.entityState!.active = new Set(["user-bob"]) // switch active user
    state.entityState!.owned = new Set(["user-bob"])
    context = { derivedState: deriveEntityState(org, state) }

    // Bob should see approve and reject
    available = runtime.getAvailable(state, context)
    expect(available).toHaveLength(2)

    const rejectAction = available.find((a) => a.id === "reject")!
    result = runtime.step(state, rejectAction, context)
    state = result.state
    expect(state.currentNodeId).toBe("rejected")

    // Bob can't revise
    context = { derivedState: deriveEntityState(org, state) }
    expect(runtime.getAvailable(state, context)).toHaveLength(0)

    // Alice logs back in to revise
    state.entityState!.active = new Set(["user-alice"])
    state.entityState!.owned = new Set(["user-alice"])
    context = { derivedState: deriveEntityState(org, state) }

    available = runtime.getAvailable(state, context)
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe("revise")

    result = runtime.step(state, available[0], context)
    state = result.state
    expect(state.currentNodeId).toBe("draft") // Back to start!
  })
})
