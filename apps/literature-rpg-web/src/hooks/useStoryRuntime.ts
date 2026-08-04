import { useCallback, useEffect, useState } from "react"
import type { Frame, FrameChoice, Intent } from "@fiction-map/protocol"

export type ClientGameState = Frame

export function useStoryRuntime() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async (intent?: Intent) => {
    setLoading(true)
    setError(null)
    try {
      const body = { sessionId, intent }
      const res = await fetch("http://localhost:8080/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
        console.error("Engine API error:", data.error)
      }
      if (data.frame) {
        setGameState(data.frame)
      }
      if (data.sessionId) {
        setSessionId(data.sessionId)
      }
    } catch (e) {
      console.error("Failed to fetch state:", e)
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  // Initial fetch
  useEffect(() => {
    if (!gameState && !loading && sessionId === null) {
      fetchState()
    }
  }, [gameState, loading, sessionId, fetchState])

  // Initial mount trigger
  useEffect(() => {
    let mounted = true;
    fetch("http://localhost:8080/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(data => {
         if (!mounted) return;
         if (data.frame) setGameState(data.frame);
         if (data.sessionId) setSessionId(data.sessionId);
         setLoading(false);
      })
      .catch(e => {
         if (!mounted) return;
         console.error("Failed to fetch initial state:", e);
         setError((e as Error).message);
         setLoading(false);
      });
    return () => { mounted = false; };
  }, [])

  const step = useCallback(
    (choice: FrameChoice) => {
      fetchState({ type: "selectChoice", choiceId: choice.id })
    },
    [fetchState],
  )

  const reset = useCallback(() => {
    setSessionId(null)
    setGameState(null)
    setLoading(true)
    // The initial mount logic won't run again, so we need to call fetchState directly
    // but without sessionId to force a new session.
    fetch("http://localhost:8080/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then(res => res.json())
      .then(data => {
         if (data.frame) setGameState(data.frame);
         if (data.sessionId) setSessionId(data.sessionId);
         setLoading(false);
      })
      .catch(e => {
         console.error("Failed to fetch new state:", e);
         setError((e as Error).message);
         setLoading(false);
      });
  }, [])

  return {
    gameState,
    loading,
    error,
    step,
    reset,
  }
}
