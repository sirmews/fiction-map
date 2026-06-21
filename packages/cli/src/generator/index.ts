/**
 * Metadata generator
 *
 * Orchestrates file discovery and extraction to produce metadata.json
 */

import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import {
  analyzeGraph,
  type ConditionDefinition,
  type EdgeTypeDefinition,
  type EffectDefinition,
  type GraphDefinition,
  type GraphMetadata,
  type NodeTypeDefinition,
  ProjectRegistry,
  type StructDefinition,
} from "@fiction-map/core"
import { defineWorld, EntityRegistry } from "@fiction-map/entities"
import {
  builtinConditionConfigs,
  builtinEffectConfigs,
  createRuntimeFromGraph,
  validateGraphSemantics,
} from "@fiction-map/runtime"
import { discoverFiles } from "./discover"
import {
  extractCondition,
  extractEdgeType,
  extractEffect,
  extractGraph,
  extractNodeType,
  extractStruct,
} from "./extract"
import { renderSemantics } from "./semantics"

export { renderSemantics } from "./semantics"

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

function seedBuiltins(registry: ProjectRegistry): void {
  for (const condition of builtinConditionConfigs) {
    if (!registry.conditions.has(condition.id)) {
      registry.conditions.set(condition.id, {
        id: condition.id,
        name: condition.id,
        parameters: condition.parameters ?? {},
        location: { file: "@fiction-map/runtime", line: 1, column: 1 },
      })
    }
  }

  for (const effect of builtinEffectConfigs) {
    if (!registry.effects.has(effect.id)) {
      registry.effects.set(effect.id, {
        id: effect.id,
        name: effect.id,
        parameters: effect.parameters ?? {},
        location: { file: "@fiction-map/runtime", line: 1, column: 1 },
      })
    }
  }
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
export async function buildMetadata(
  options: Pick<GeneratorOptions, "rootDir">,
): Promise<GraphMetadata> {
  const { rootDir } = options
  const discovered = await discoverFiles(rootDir)

  const nodeTypes: NodeTypeDefinition[] = []
  const edgeTypes: EdgeTypeDefinition[] = []
  const conditions: ConditionDefinition[] = []
  const effects: EffectDefinition[] = []
  const graphs: GraphDefinition[] = []
  const structs: StructDefinition[] = []

  for (const file of discovered.structs) {
    const def = extractStruct(file.path, rootDir)
    if (def) structs.push(def)
  }

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

  // Validate graphs against the extracted types
  const registry = new ProjectRegistry()
  for (const st of structs) registry.structs.set(st.id, st)
  for (const nt of nodeTypes) registry.nodeTypes.set(nt.id, nt)
  for (const et of edgeTypes) registry.edgeTypes.set(et.id, et)
  seedBuiltins(registry)
  for (const cond of conditions) registry.conditions.set(cond.id, cond)
  for (const eff of effects) registry.effects.set(eff.id, eff)

  const topLevelErrors: any[] = []
  const topLevelWarnings: any[] = []

  for (const graph of graphs) {
    Object.assign(graph, analyzeGraph(registry, graph.nodes, graph.edges))

    // Run semantic validation
    try {
      const runtime = createRuntimeFromGraph(graph)
      const emptyWorld = defineWorld(new EntityRegistry(), { id: "empty", entities: [] })
      const semanticResult = validateGraphSemantics(runtime, emptyWorld)

      for (const err of semanticResult.errors) {
        graph.warnings.push({
          code: "SEMANTIC_ISSUE",
          message: `[${err.type}] ${err.message} (Path: ${err.path.join(" -> ")})`,
        })
      }
    } catch (e: any) {
      graph.warnings.push({
        code: "SEMANTIC_VALIDATION_SKIPPED",
        message: `Could not run semantic validation: ${e.message}`,
      })
    }
  }

  return {
    nodeTypes,
    edgeTypes,
    conditions,
    effects,
    graphs,
    structs,
    validation: {
      errors: topLevelErrors,
      warnings: topLevelWarnings,
    },
  }
}

/**
 * Write metadata to the standard output location.
 */
export async function writeMetadata(
  metadata: GraphMetadata,
  options: GeneratorOptions,
): Promise<string> {
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
 * Generate SEMANTICS.md from metadata.
 *
 * Rendering is delegated to `renderSemantics` so the same string can be produced
 * without filesystem side effects (used by `generate --check`).
 */
export async function generateSemantics(
  metadata: GraphMetadata,
  options: GeneratorOptions,
): Promise<string> {
  const resolved = resolveGeneratorOptions(options)
  const content = renderSemantics(metadata)
  const outputPath = getSemanticsPath(resolved)
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, content)

  return outputPath
}

export interface ProjectCheckMismatch {
  path: string
  reason: "missing" | "different"
}

export interface ProjectCheckResult {
  ok: boolean
  metadataPath: string
  semanticsPath: string
  mismatches: ProjectCheckMismatch[]
}

async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

/**
 * Compute what `generateProject` would produce and compare against the on-disk
 * artifacts without writing anything. Used by `fiction-map generate --check`
 * (and any pre-commit hook that wants to fail when metadata/semantics are stale).
 */
export async function checkProject(options: GeneratorOptions): Promise<ProjectCheckResult> {
  const resolved = resolveGeneratorOptions(options)
  const metadata = await buildMetadata({ rootDir: resolved.rootDir })
  const expectedMetadata = JSON.stringify(metadata, null, 2)
  const expectedSemantics = renderSemantics(metadata)

  const metadataPath = getMetadataPath(resolved)
  const semanticsPath = getSemanticsPath(resolved)

  const [actualMetadata, actualSemantics] = await Promise.all([
    readFileOrNull(metadataPath),
    readFileOrNull(semanticsPath),
  ])

  const mismatches: ProjectCheckMismatch[] = []

  if (actualMetadata === null) {
    mismatches.push({ path: metadataPath, reason: "missing" })
  } else if (
    actualMetadata.replace(/\\r\\n/g, "\\n").trimEnd() !==
    expectedMetadata.replace(/\\r\\n/g, "\\n").trimEnd()
  ) {
    mismatches.push({ path: metadataPath, reason: "different" })
  }

  if (actualSemantics === null) {
    mismatches.push({ path: semanticsPath, reason: "missing" })
  } else if (
    actualSemantics.replace(/\\r\\n/g, "\\n").trimEnd() !==
    expectedSemantics.replace(/\\r\\n/g, "\\n").trimEnd()
  ) {
    mismatches.push({ path: semanticsPath, reason: "different" })
  }

  return {
    ok: mismatches.length === 0,
    metadataPath,
    semanticsPath,
    mismatches,
  }
}
