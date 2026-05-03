import type { ReactNode } from "react"
import type { ContextPack } from "../lib/context-packs"

export interface ContextPackCardProps {
  onCopy?(value: string): void
  pack: ContextPack
}

export function ContextPackCard({ onCopy, pack }: ContextPackCardProps) {
  const handleCopy = async (value: string) => {
    if (onCopy) {
      onCopy(value)
      return
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    }
  }

  return (
    <article style={styles.card}>
      <div style={styles.header}>
        <div>
          <div style={styles.badge}>{pack.kind}</div>
          <h2 style={styles.title}>{pack.title}</h2>
          <p style={styles.purpose}>{pack.purpose}</p>
        </div>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={() => void handleCopy(pack.promptSeed)}>
            Copy Prompt Seed
          </button>
          <button style={styles.button} onClick={() => void handleCopy(pack.contextBlock)}>
            Copy Full Context Pack
          </button>
        </div>
      </div>

      <p style={styles.summary}>{pack.summary}</p>

      <Section title="System View">
        <ul style={styles.list}>
          {pack.systemView.map((entry) => (
            <li key={entry} style={styles.listItem}>
              {entry}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Key Concepts">
        <ul style={styles.list}>
          {pack.keyConcepts.map((concept) => (
            <li key={concept.name} style={styles.listItem}>
              <strong>{concept.name}:</strong> {concept.explanation}
            </li>
          ))}
        </ul>
      </Section>

      <div style={styles.referenceGrid}>
        <Section title="Evidence">
          <ul style={styles.referenceList}>
            {pack.evidence.map((entry) => (
              <li key={`${entry.path}:${entry.label}`} style={styles.referenceItem}>
                <strong>{entry.label}</strong>
                <span style={styles.referencePath}>{entry.path}</span>
                <span>{entry.reason}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Inspect Next">
          <ul style={styles.referenceList}>
            {pack.nextLook.map((entry) => (
              <li key={`${entry.path}:${entry.label}`} style={styles.referenceItem}>
                <strong>{entry.label}</strong>
                <span style={styles.referencePath}>{entry.path}</span>
                <span>{entry.focus ?? entry.reason}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {pack.implementationStatus ? (
        <Section title="Implementation Status">
          <ul style={styles.list}>
            {pack.implementationStatus.map((entry) => (
              <li key={entry} style={styles.listItem}>
                {entry}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {pack.cautions?.length ? (
        <Section title="Cautions">
          <ul style={styles.list}>
            {pack.cautions.map((entry) => (
              <li key={entry} style={styles.listItem}>
                {entry}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  )
}

function Section(props: { children: ReactNode; title: string }) {
  return (
    <section style={styles.section}>
      <h3 style={styles.sectionTitle}>{props.title}</h3>
      {props.children}
    </section>
  )
}

const styles = {
  badge: {
    display: "inline-flex",
    padding: "4px 8px",
    borderRadius: "999px",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#5f4a12",
    background: "rgba(184, 145, 41, 0.14)",
    marginBottom: "10px",
  },
  button: {
    appearance: "none",
    border: "1px solid rgba(28, 26, 23, 0.14)",
    borderRadius: "999px",
    padding: "10px 14px",
    background: "#fffdf8",
    color: "#2e261c",
    fontSize: "13px",
    cursor: "pointer",
  },
  buttonGroup: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },
  card: {
    borderRadius: "22px",
    border: "1px solid rgba(28, 26, 23, 0.12)",
    background: "rgba(255, 252, 246, 0.92)",
    padding: "24px",
    display: "grid",
    gap: "18px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },
  list: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "8px",
  },
  listItem: {
    color: "#463b2b",
    lineHeight: 1.5,
  },
  purpose: {
    margin: 0,
    color: "#665844",
    lineHeight: 1.5,
  },
  referenceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: "16px",
  },
  referenceItem: {
    display: "grid",
    gap: "4px",
    color: "#463b2b",
    lineHeight: 1.5,
  },
  referenceList: {
    margin: 0,
    paddingLeft: "18px",
    display: "grid",
    gap: "12px",
  },
  referencePath: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: "12px",
    color: "#7a6a53",
  },
  section: {
    display: "grid",
    gap: "10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "#7a6240",
  },
  summary: {
    margin: 0,
    color: "#3f3426",
    lineHeight: 1.6,
    fontSize: "15px",
  },
  title: {
    margin: 0,
    fontSize: "24px",
    color: "#241b11",
  },
} as const
