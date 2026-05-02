/**
 * Metadata generator
 * 
 * Orchestrates file discovery and extraction to produce metadata.json
 */

import { lstat, mkdir, readFile, rm, writeFile } from "fs/promises"
import { dirname, join } from "path"
import type { GraphMetadata, NodeTypeDefinition, EdgeTypeDefinition, ConditionDefinition, EffectDefinition, GraphDefinition } from "@fiction-map/core"
import { discoverFiles } from "./discover"
import { extractNodeType, extractEdgeType, extractCondition, extractEffect, extractGraph } from "./extract"

export interface GeneratorOptions {
  rootDir: string
  outputDir?: string
}

export interface ResolvedGeneratorOptions {
  rootDir: string
  outputDir: string
}

export interface GeneratorResult {
  metadata: GraphMetadata
  metadataPath: string
}

export interface ProjectGenerationResult {
  metadata: GraphMetadata
  metadataPath: string
  semanticsPath: string
}

interface FileBackup {
  contents?: string
  exists: boolean
  isFile: boolean
}

function resolveGeneratorOptions(options: GeneratorOptions): ResolvedGeneratorOptions {
  return {
    rootDir: options.rootDir,
    outputDir: options.outputDir ?? options.rootDir,
  }
}

function getMetadataPath(options: ResolvedGeneratorOptions): string {
  return join(options.outputDir, ".fiction-map", "metadata.json")
}

function getSemanticsPath(options: ResolvedGeneratorOptions): string {
  return join(options.outputDir, "SEMANTICS.md")
}

async function captureFileBackup(path: string): Promise<FileBackup> {
  try {
    const stat = await lstat(path)
    if (!stat.isFile()) {
      return {
        exists: true,
        isFile: false,
      }
    }

    return {
      contents: await readFile(path, "utf8"),
      exists: true,
      isFile: true,
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { exists: false, isFile: false }
    }

    throw error
  }
}

async function restoreFileBackup(path: string, backup: FileBackup): Promise<void> {
  if (!backup.exists) {
    await rm(path, { force: true })
    return
  }

  if (!backup.isFile) {
    return
  }

  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, backup.contents ?? "")
}

/**
 * Build metadata from a project without filesystem side effects.
 */
export async function buildMetadata(options: Pick<GeneratorOptions, "rootDir">): Promise<GraphMetadata> {
  const { rootDir } = options
  const discovered = await discoverFiles(rootDir)

  const nodeTypes: NodeTypeDefinition[] = []
  const edgeTypes: EdgeTypeDefinition[] = []
  const conditions: ConditionDefinition[] = []
  const effects: EffectDefinition[] = []
  const graphs: GraphDefinition[] = []
  
  for (const file of discovered.nodes) {
    const def = extractNodeType(file.path, rootDir)
    if (def) nodeTypes.push(def)
  }
  
  for (const file of discovered.edges) {
    const def = extractEdgeType(file.path, rootDir)
    if (def) edgeTypes.push(def)
  }
  
  for (const file of discovered.conditions) {
    const def = extractCondition(file.path, rootDir)
    if (def) conditions.push(def)
  }
  
  for (const file of discovered.effects) {
    const def = extractEffect(file.path, rootDir)
    if (def) effects.push(def)
  }
  
  for (const file of discovered.graphs) {
    const def = extractGraph(file.path, rootDir)
    if (def) graphs.push(def)
  }

  return {
    nodeTypes,
    edgeTypes,
    conditions,
    effects,
    graphs,
    validation: {
      errors: [],
      warnings: [],
    },
  }
}

/**
 * Write metadata to the standard output location.
 */
export async function writeMetadata(metadata: GraphMetadata, options: GeneratorOptions): Promise<string> {
  const resolved = resolveGeneratorOptions(options)
  const outputPath = getMetadataPath(resolved)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, JSON.stringify(metadata, null, 2))

  return outputPath
}

/**
 * Main metadata generation API for callers that want discovery plus file output.
 */
export async function generateMetadata(options: GeneratorOptions): Promise<GeneratorResult> {
  const resolved = resolveGeneratorOptions(options)
  const metadata = await buildMetadata({ rootDir: resolved.rootDir })
  const metadataPath = await writeMetadata(metadata, resolved)

  return { metadata, metadataPath }
}

/**
 * Full project generation API for callers that want all generated artifacts written.
 */
export async function generateProject(options: GeneratorOptions): Promise<ProjectGenerationResult> {
  const resolved = resolveGeneratorOptions(options)
  const metadataBackup = await captureFileBackup(getMetadataPath(resolved))
  const semanticsBackup = await captureFileBackup(getSemanticsPath(resolved))
  const { metadata, metadataPath } = await generateMetadata(resolved)

  let semanticsPath: string
  try {
    semanticsPath = await generateSemantics(metadata, resolved)
  } catch (error) {
    await restoreFileBackup(metadataPath, metadataBackup)
    await restoreFileBackup(getSemanticsPath(resolved), semanticsBackup)
    throw error
  }

  return { metadata, metadataPath, semanticsPath }
}

/**
 * Generate SEMANTICS.md from metadata
 */
export async function generateSemantics(metadata: GraphMetadata, options: GeneratorOptions): Promise<string> {
  const resolved = resolveGeneratorOptions(options)
  const lines: string[] = [
    "# Graph Semantics",
    "",
    "> Auto-generated by fiction-map. DO NOT EDIT.",
    "",
  ]
  
  // Node types
  if (metadata.nodeTypes.length > 0) {
    lines.push("## Node Types", "")
    
    for (const node of metadata.nodeTypes) {
      lines.push(`<node_type id="${node.id}">`)
      if (node.description) lines.push(`  <description>${node.description}</description>`)
      if (node.aiRule) lines.push(`  <ai_rule>${node.aiRule}</ai_rule>`)
      lines.push(`  <location file="${node.location.file}" line="${node.location.line}" />`)
      lines.push(`</node_type>`)
      lines.push("")
    }
  }
  
  // Edge types
  if (metadata.edgeTypes.length > 0) {
    lines.push("## Edge Types", "")
    
    for (const edge of metadata.edgeTypes) {
      lines.push(`<edge_type id="${edge.id}">`)
      if (edge.description) lines.push(`  <description>${edge.description}</description>`)
      if (edge.aiRule) lines.push(`  <ai_rule>${edge.aiRule}</ai_rule>`)
      lines.push(`  <source_types>${edge.sourceTypes.join(", ")}</source_types>`)
      lines.push(`  <target_types>${edge.targetTypes.join(", ")}</target_types>`)
      lines.push(`  <location file="${edge.location.file}" line="${edge.location.line}" />`)
      lines.push(`</edge_type>`)
      lines.push("")
    }
  }
  
  // Conditions
  if (metadata.conditions.length > 0) {
    lines.push("## Conditions", "")
    
    for (const cond of metadata.conditions) {
      lines.push(`<condition id="${cond.id}">`)
      if (cond.description) lines.push(`  <description>${cond.description}</description>`)
      if (cond.aiRule) lines.push(`  <ai_rule>${cond.aiRule}</ai_rule>`)
      lines.push(`</condition>`)
      lines.push("")
    }
  }
  
  // Effects
  if (metadata.effects.length > 0) {
    lines.push("## Effects", "")
    
    for (const effect of metadata.effects) {
      lines.push(`<effect id="${effect.id}">`)
      if (effect.description) lines.push(`  <description>${effect.description}</description>`)
      if (effect.aiRule) lines.push(`  <ai_rule>${effect.aiRule}</ai_rule>`)
      lines.push(`</effect>`)
      lines.push("")
    }
  }
  
  // Graphs
  if (metadata.graphs.length > 0) {
    lines.push("## Graphs", "")
    
    for (const graph of metadata.graphs) {
      lines.push(`<graph id="${graph.id}">`)
      if (graph.description) lines.push(`  <description>${graph.description}</description>`)
      lines.push(`  <stats nodes="${graph.nodeCount}" edges="${graph.edgeCount}" />`)
      lines.push(`  <location file="${graph.location.file}" line="${graph.location.line}" />`)
      lines.push(`</graph>`)
      lines.push("")
    }
  }
  
  const content = lines.join("\n")
  const outputPath = getSemanticsPath(resolved)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content)

  return outputPath
}
