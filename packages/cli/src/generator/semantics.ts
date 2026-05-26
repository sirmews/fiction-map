/**
 * Pure renderer for SEMANTICS.md.
 *
 * Takes a GraphMetadata and produces a Markdown string optimized for LLM consumption:
 * - "How to read this file" preamble
 * - TypeScript-shaped signatures so the model sees the actual define* call shape
 * - Inline @description / @ai-rule annotations
 * - Topology tables for graphs (source → edge → target)
 *
 * Kept side-effect free so it can be used by both `generate` (writes to disk) and
 * `generate --check` (compares in-memory output against the on-disk file).
 */

import type {
  ConditionDefinition,
  EdgeTypeDefinition,
  EffectDefinition,
  GraphDefinition,
  GraphMetadata,
  NodeInstance,
  NodeTypeDefinition,
  PropertyDefinition,
  PropertySchema,
} from "@fiction-map/core"

const INDENT = "  "

function formatInstanceFieldValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value)
  return JSON.stringify(value)
}

function formatConditionInstance(condition: { type: string; [key: string]: unknown }): string {
  const args = Object.entries(condition)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key}=${formatInstanceFieldValue(value)}`)

  return args.length > 0 ? `${condition.type}(${args.join(", ")})` : condition.type
}

function formatEffectInstance(effect: { type: string; [key: string]: unknown }): string {
  const args = Object.entries(effect)
    .filter(([key]) => key !== "type")
    .map(([key, value]) => `${key}=${formatInstanceFieldValue(value)}`)

  return args.length > 0 ? `${effect.type}(${args.join(", ")})` : effect.type
}

function formatPropertySchema(schema: PropertySchema): string {
  const fields: string[] = [`type: "${schema.type}"`]
  if (schema.required) fields.push("required: true")
  if (schema.default !== undefined) fields.push(`default: ${JSON.stringify(schema.default)}`)
  if (schema.values && schema.values.length > 0) {
    fields.push(`values: [${schema.values.map((v) => JSON.stringify(v)).join(", ")}]`)
  }
  return `{ ${fields.join(", ")} }`
}

function formatProperties(properties: PropertyDefinition, indent = INDENT): string {
  const entries = Object.entries(properties)
  if (entries.length === 0) return "{}"

  const lines = entries.map(([name, schema]) => `${indent}${INDENT}${name}: ${formatPropertySchema(schema)},`)
  return `{\n${lines.join("\n")}\n${indent}}`
}

function formatStringArray(values: string[]): string {
  return `[${values.map((v) => JSON.stringify(v)).join(", ")}]`
}

function formatLocation(location: { file: string; line: number }): string {
  return `${location.file}:${location.line}`
}

function renderNodeTypeBlock(nt: NodeTypeDefinition): string {
  const lines: string[] = [`### \`${nt.id}\``, ""]

  if (nt.description) lines.push(`> ${nt.description}`)
  if (nt.aiRule) lines.push(`> **AI rule:** ${nt.aiRule}`)
  if (nt.description || nt.aiRule) lines.push("")

  const body: string[] = [
    "```typescript",
    `defineNodeType(registry, {`,
    `${INDENT}id: ${JSON.stringify(nt.id)},`,
    `${INDENT}properties: ${formatProperties(nt.properties)},`,
  ]
  if (nt.outgoingEdges.length > 0) {
    body.push(`${INDENT}outgoingEdges: ${formatStringArray(nt.outgoingEdges)},`)
  }
  if (nt.incomingEdges.length > 0) {
    body.push(`${INDENT}incomingEdges: ${formatStringArray(nt.incomingEdges)},`)
  }
  body.push("})", "```")

  lines.push(...body, "", `Source: \`${formatLocation(nt.location)}\``)
  return lines.join("\n")
}

function renderEdgeTypeBlock(et: EdgeTypeDefinition): string {
  const lines: string[] = [`### \`${et.id}\``, ""]

  if (et.description) lines.push(`> ${et.description}`)
  if (et.aiRule) lines.push(`> **AI rule:** ${et.aiRule}`)
  if (et.description || et.aiRule) lines.push("")

  const body: string[] = [
    "```typescript",
    `defineEdgeType(registry, {`,
    `${INDENT}id: ${JSON.stringify(et.id)},`,
    `${INDENT}sourceTypes: ${formatStringArray(et.sourceTypes)},`,
    `${INDENT}targetTypes: ${formatStringArray(et.targetTypes)},`,
  ]
  if (Object.keys(et.properties).length > 0) {
    body.push(`${INDENT}properties: ${formatProperties(et.properties)},`)
  }
  body.push("})", "```")

  lines.push(...body, "", `Source: \`${formatLocation(et.location)}\``)
  return lines.join("\n")
}

function renderConditionBlock(cond: ConditionDefinition): string {
  const lines: string[] = [`### \`${cond.id}\``, ""]
  if (cond.description) lines.push(`> ${cond.description}`)
  if (cond.aiRule) lines.push(`> **AI rule:** ${cond.aiRule}`)
  if (cond.description || cond.aiRule) lines.push("")

  const body: string[] = ["```typescript", `defineCondition(registry, {`, `${INDENT}id: ${JSON.stringify(cond.id)},`]
  if (Object.keys(cond.parameters).length > 0) {
    body.push(`${INDENT}parameters: ${formatProperties(cond.parameters)},`)
  }
  body.push("})", "```")
  lines.push(...body, "", `Source: \`${formatLocation(cond.location)}\``)
  return lines.join("\n")
}

function renderEffectBlock(effect: EffectDefinition): string {
  const lines: string[] = [`### \`${effect.id}\``, ""]
  if (effect.description) lines.push(`> ${effect.description}`)
  if (effect.aiRule) lines.push(`> **AI rule:** ${effect.aiRule}`)
  if (effect.description || effect.aiRule) lines.push("")

  const body: string[] = ["```typescript", `defineEffect(registry, {`, `${INDENT}id: ${JSON.stringify(effect.id)},`]
  if (Object.keys(effect.parameters).length > 0) {
    body.push(`${INDENT}parameters: ${formatProperties(effect.parameters)},`)
  }
  body.push("})", "```")
  lines.push(...body, "", `Source: \`${formatLocation(effect.location)}\``)
  return lines.join("\n")
}

function renderGraphBlock(graph: GraphDefinition): string {
  const lines: string[] = [`### \`${graph.id}\``, ""]
  if (graph.description) lines.push(`> ${graph.description}`, "")

  lines.push(
    `- ${graph.nodeCount} node${graph.nodeCount === 1 ? "" : "s"}, ${graph.edgeCount} edge${graph.edgeCount === 1 ? "" : "s"}, max depth: ${graph.maxDepth}`
  )
  if (graph.endings.length > 0) {
    lines.push(`- Endings: ${graph.endings.map((e) => `\`${e}\``).join(", ")}`)
  }
  if (graph.conditionsUsed.length > 0) {
    lines.push(`- Conditions used: ${graph.conditionsUsed.map((c) => `\`${c}\``).join(", ")}`)
  }
  if (graph.effectsUsed.length > 0) {
    lines.push(`- Effects used: ${graph.effectsUsed.map((e) => `\`${e}\``).join(", ")}`)
  }
  if (graph.errors.length > 0) {
    lines.push(`- ⚠️ ${graph.errors.length} validation error${graph.errors.length === 1 ? "" : "s"}`)
  }
  if (graph.warnings.length > 0) {
    lines.push(`- ⚠️ ${graph.warnings.length} validation warning${graph.warnings.length === 1 ? "" : "s"}`)
  }

  if (graph.edges.length > 0) {
    const nodeTypeById = new Map<string, string>()
    for (const node of graph.nodes as NodeInstance[]) {
      nodeTypeById.set(node.id, node.type)
    }

    lines.push(
      "",
      "**Topology:**",
      "",
      "| Source | Edge | Target | Conditions | Effects |",
      "|---|---|---|---|---|"
    )
    for (const edge of graph.edges) {
      const sourceType = nodeTypeById.get(edge.source) ?? "?"
      const targetType = nodeTypeById.get(edge.target) ?? "?"
      const conditions = edge.conditions && edge.conditions.length > 0
        ? edge.conditions.map((condition) => `\`${formatConditionInstance(condition)}\``).join("<br>")
        : "—"
      const effects = edge.effects && edge.effects.length > 0
        ? edge.effects.map((effect) => `\`${formatEffectInstance(effect)}\``).join("<br>")
        : "—"
      lines.push(
        `| \`${edge.source}\` (${sourceType}) | \`${edge.id}\` (${edge.type}) | \`${edge.target}\` (${targetType}) | ${conditions} | ${effects} |`
      )
    }
  }

  lines.push("", `Source: \`${formatLocation(graph.location)}\``)
  return lines.join("\n")
}

function renderSection<T>(
  title: string,
  items: T[],
  render: (item: T) => string
): string[] {
  if (items.length === 0) return []
  const heading = `## ${title} (${items.length})`
  const blocks = items.map(render).join("\n\n---\n\n")
  return [heading, "", blocks]
}

export function renderSemantics(metadata: GraphMetadata): string {
  const sections: string[] = [
    "# Fiction Map — Generated Semantics",
    "",
    "> Auto-generated by `fiction-map generate`. DO NOT EDIT BY HAND.",
    "",
    "## How to read this file",
    "",
    "This file describes the graph primitives discovered in this project. It is intended to be read by humans and AI coding assistants before suggesting edits.",
    "",
    "- **Node types** are the kinds of nodes that may appear in a graph.",
    "- **Edge types** are connections allowed between specific node types.",
    "- **Conditions** gate transitions; they are evaluated against runtime state.",
    "- **Effects** apply when a transition is taken.",
    "- **Graphs** are concrete instances assembled from the types above.",
    "",
    "Each entry shows its source location and (where present) author-supplied `@description` and `@ai-rule` annotations. Run `fiction-map validate` to check that the current graphs satisfy their declared types.",
    "",
  ]

  for (const block of renderSection("Node Types", metadata.nodeTypes, renderNodeTypeBlock)) {
    sections.push(block)
  }
  if (metadata.nodeTypes.length > 0) sections.push("", "---", "")

  for (const block of renderSection("Edge Types", metadata.edgeTypes, renderEdgeTypeBlock)) {
    sections.push(block)
  }
  if (metadata.edgeTypes.length > 0) sections.push("", "---", "")

  for (const block of renderSection("Conditions", metadata.conditions, renderConditionBlock)) {
    sections.push(block)
  }
  if (metadata.conditions.length > 0) sections.push("", "---", "")

  for (const block of renderSection("Effects", metadata.effects, renderEffectBlock)) {
    sections.push(block)
  }
  if (metadata.effects.length > 0) sections.push("", "---", "")

  for (const block of renderSection("Graphs", metadata.graphs, renderGraphBlock)) {
    sections.push(block)
  }

  return sections.join("\n").replace(/\n+$/, "") + "\n"
}
