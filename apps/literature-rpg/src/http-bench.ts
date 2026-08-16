/**
 * literature-rpg HTTP server load test.
 *
 * Measures the ACTUAL per-request server cost — what a real player session
 * looks like: start a session, walk the graph intent-by-intent. This is the
 * workload that determines server sizing, not enumeratePaths.
 *
 * Run:  bun run src/http-bench.ts
 *
 * Spawns the real HTTP server from main.ts, fires sequential /intent requests
 * (one player walking), and reports per-request latency + throughput. Then
 * runs a concurrent burst to measure under load.
 */
import { performance } from "node:perf_hooks"
import { startHttpServer } from "./main"

const PORT = 18099
const BASE = `http://localhost:${PORT}`

interface Sample {
  ms: number
  ok: boolean
}

async function timedFetch(url: string, init?: RequestInit): Promise<{ ms: number; ok: boolean; body: any }> {
  const t = performance.now()
  const res = await fetch(url, init)
  const body = await res.json()
  return { ms: performance.now() - t, ok: res.status === 200, body }
}

function report(label: string, samples: Sample[]) {
  const times = samples.map((s) => s.ms).sort((a, b) => a - b)
  const ok = samples.filter((s) => s.ok).length
  const med = times[Math.floor(times.length / 2)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const p99 = times[Math.floor(times.length * 0.99)]
  const min = times[0]
  const max = times[times.length - 1]
  const totalMs = times.reduce((a, b) => a + b, 0)
  const rps = (samples.length / (totalMs / 1000)).toFixed(1)
  console.log(
    `${label.padEnd(50)} n=${samples.length} ok=${ok}/${samples.length} ` +
    `med=${med.toFixed(2)}ms p95=${p95.toFixed(2)}ms p99=${p99.toFixed(2)}ms ` +
    `min=${min.toFixed(2)}ms max=${max.toFixed(2)}ms rps=${rps}`,
  )
}

async function main() {
  const server = startHttpServer(PORT)
  // Wait for server to be ready
  for (let i = 0; i < 20; i++) {
    try {
      await fetch(`${BASE}/health`)
      break
    } catch {
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  // -----------------------------------------------------------------------
  // 1. Sequential single-player walk (the realistic workload)
  // -----------------------------------------------------------------------
  {
    const samples: Sample[] = []
    let sessionId: string | undefined
    // Start session
    const start = await timedFetch(`${BASE}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    sessionId = start.body.sessionId
    samples.push({ ms: start.ms, ok: start.ok })

    // Walk by always picking the first available choice from the frame
    for (let step = 0; step < 50; step++) {
      const choices = start.body?.frame?.choices ?? []
      if (choices.length === 0) break
      const choice = choices[0]
      const res = await timedFetch(`${BASE}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, intent: { type: "selectChoice", choiceId: choice.id } }),
      })
      sessionId = res.body?.sessionId ?? sessionId
      samples.push({ ms: res.ms, ok: res.ok })
      // Update choices for next step from the returned frame
      ; (start.body as any).frame = res.body?.frame ?? { choices: [] }
    }
    report("sequential walk (single player, 50 intents)", samples)
  }

  // -----------------------------------------------------------------------
  // 2. Concurrent burst — many fresh sessions at once
  // -----------------------------------------------------------------------
  for (const concurrency of [10, 50, 100]) {
    const samples: Sample[] = []
    const promises: Promise<Sample>[] = []
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        timedFetch(`${BASE}/intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).then((r) => ({ ms: r.ms, ok: r.ok })),
      )
    }
    const results = await Promise.all(promises)
    samples.push(...results)
    report(`concurrent burst (${concurrency} fresh sessions)`, samples)
  }

  // -----------------------------------------------------------------------
  // 3. Sustained throughput — 500 sequential fresh sessions
  // -----------------------------------------------------------------------
  {
    const samples: Sample[] = []
    for (let i = 0; i < 500; i++) {
      const res = await timedFetch(`${BASE}/intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      samples.push({ ms: res.ms, ok: res.ok })
    }
    report("sustained 500 fresh sessions (sequential)", samples)
  }

  server.stop()
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
