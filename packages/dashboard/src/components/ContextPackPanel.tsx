import type { ContextPack } from "../lib/context-packs"
import { ContextPackCard } from "./ContextPackCard"

export interface ContextPackPanelProps {
  onCopy?(value: string): void
  packs: ContextPack[]
}

export function ContextPackPanel({ onCopy, packs }: ContextPackPanelProps) {
  return (
    <section style={styles.panel}>
      <div style={styles.header}>
        <div>
          <p style={styles.kicker}>Architecture Packs</p>
          <h2 style={styles.title}>Orientation-first context packs</h2>
        </div>
        <p style={styles.caption}>
          These packs are starting points, not full repository exports. Each one
          should tell a human or an LLM what to inspect next.
        </p>
      </div>

      <div style={styles.grid}>
        {packs.map((pack) => (
          <ContextPackCard key={pack.id} pack={pack} onCopy={onCopy} />
        ))}
      </div>
    </section>
  )
}

const styles = {
  caption: {
    margin: 0,
    maxWidth: "420px",
    color: "#665844",
    lineHeight: 1.5,
  },
  grid: {
    display: "grid",
    gap: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
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
  },
  title: {
    margin: 0,
    fontSize: "28px",
    color: "#241b11",
  },
} as const
