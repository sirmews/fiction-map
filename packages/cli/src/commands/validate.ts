/**
 * Validate command
 *
 * Usage: fiction-map validate [options]
 *
 * Reads .fiction-map/metadata.json and exits non-zero if any graph reports
 * validation errors. Warnings are printed but do not fail the command unless
 * --strict is passed.
 */

import { readFile } from "fs/promises"
import { join, relative, resolve } from "path"
import type { GraphMetadata } from "@fiction-map/core"

export interface ValidateOptions {
  rootDir?: string
  outputDir?: string
  strict?: boolean
}

interface ValidationSummary {
  graphErrors: number
  graphWarnings: number
  topLevelErrors: number
  topLevelWarnings: number
}

export async function validate(options: ValidateOptions = {}): Promise<void> {
  const rootDir = resolve(options.rootDir || process.cwd())
  const outputDir = options.outputDir ? resolve(options.outputDir) : rootDir
  const metadataPath = join(outputDir, ".fiction-map", "metadata.json")

  console.log(`\n🧪 Fiction Map Validator`)
  console.log(`   Metadata: ${relative(rootDir, metadataPath)}`)
  console.log("")

  let metadata: GraphMetadata
  try {
    const raw = await readFile(metadataPath, "utf8")
    metadata = JSON.parse(raw) as GraphMetadata
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`❌ ${relative(rootDir, metadataPath)} not found. Run \`fiction-map generate\` first.\n`)
      process.exit(1)
    }
    console.error("\n❌ Failed to read metadata:")
    console.error(error)
    process.exit(1)
  }

  const summary: ValidationSummary = {
    graphErrors: 0,
    graphWarnings: 0,
    topLevelErrors: metadata.validation?.errors?.length ?? 0,
    topLevelWarnings: metadata.validation?.warnings?.length ?? 0,
  }

  if (metadata.validation?.errors?.length) {
    console.error(`Top-level errors:`)
    for (const err of metadata.validation.errors) {
      console.error(`   ✖ ${err.code}: ${err.message}`)
    }
    console.error("")
  }

  const graphs = metadata.graphs || []

  for (const graph of graphs) {
    if (graph.errors.length === 0 && graph.warnings.length === 0) continue

    console.log(`Graph \`${graph.id}\` (${relative(rootDir, graph.location.file)}:${graph.location.line})`)
    for (const err of graph.errors) {
      summary.graphErrors += 1
      const where = err.edgeId ? ` [edge=${err.edgeId}]` : err.nodeId ? ` [node=${err.nodeId}]` : ""
      console.error(`   ✖ ${err.code}: ${err.message}${where}`)
    }
    for (const warn of graph.warnings) {
      summary.graphWarnings += 1
      const where = warn.nodeId ? ` [node=${warn.nodeId}]` : ""
      console.warn(`   ⚠ ${warn.code}: ${warn.message}${where}`)
    }
    console.log("")
  }

  const totalErrors = summary.graphErrors + summary.topLevelErrors
  const totalWarnings = summary.graphWarnings + summary.topLevelWarnings

  console.log(
    `Checked ${graphs.length} graph${graphs.length === 1 ? "" : "s"}: ` +
      `${totalErrors} error${totalErrors === 1 ? "" : "s"}, ` +
      `${totalWarnings} warning${totalWarnings === 1 ? "" : "s"}.`
  )

  if (totalErrors > 0 || (options.strict && totalWarnings > 0)) {
    console.error("")
    process.exit(1)
  }

  console.log("✅ Validation passed.\n")
}
