import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { startHttpServer } from "./main"

describe("HTTP Server", () => {
  let server: any
  const port = 8123
  const url = `http://localhost:${port}`

  beforeAll(() => {
    server = startHttpServer(port)
  })

  afterAll(() => {
    server.stop()
  })

  it("GET /health returns ok status", async () => {
    const res = await fetch(`${url}/health`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: "ok" })
  })

  it("POST /intent with no sessionId or intent returns initial frame and generates sessionId", async () => {
    const res = await fetch(`${url}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sessionId).toBeDefined()
    expect(body.frame).toBeDefined()
    expect(body.frame.currentNode.id).toBe("courtyard")
  })

  it("POST /intent with sessionId and selectChoice intent transitions state", async () => {
    // 1. Get initial frame and sessionId
    const res1 = await fetch(`${url}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const body1 = await res1.json()
    const sessionId = body1.sessionId

    // 2. Send selectChoice intent
    const res2 = await fetch(`${url}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        intent: {
          type: "selectChoice",
          choiceId: "enter-entrance",
        },
      }),
    })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2.sessionId).toBe(sessionId)
    expect(body2.frame.currentNode.id).toBe("entrance")
  })
})
