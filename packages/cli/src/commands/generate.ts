/**
 * Generate command
 *
 * Usage:
 *   fiction-map generate [options]
 *   fiction-map generate --check
 */

import { dirname, relative, resolve } from "node:path"
import { checkProject, generateProject } from "../generator"

export interface GenerateOptions {
  rootDir?: string
  outputDir?: string
  check?: boolean
}

export async function generate(options: GenerateOptions = {}): Promise<void> {
  const rootDir = resolve(options.rootDir || process.cwd())
  // If outputDir isn't specified but rootDir is, default to the parent of rootDir
  // (e.g. --rootDir=src -> output to .) instead of polluting the source folder.
  const outputDir = options.outputDir
    ? resolve(options.outputDir)
    : options.rootDir
      ? dirname(rootDir)
      : rootDir

  if (options.check) {
    await runCheck({ rootDir, outputDir })
    return
  }

  console.log(`\n📦 Fiction Map Generator`)
  console.log(`   Root: ${rootDir}`)
  console.log(`   Output: ${outputDir}`)
  console.log("")

  try {
    console.log(`🔍 Scanning ${rootDir}...`)

    const { metadata, metadataPath } = await generateProject({ rootDir, outputDir })

    console.log(`   Found ${metadata.nodeTypes.length} node types`)
    console.log(`   Found ${metadata.edgeTypes.length} edge types`)
    console.log(`   Found ${metadata.conditions.length} conditions`)
    console.log(`   Found ${metadata.effects.length} effects`)
    console.log(`   Found ${metadata.graphs.length} graphs`)

    console.log(`\n✅ Generated metadata at ${relative(rootDir, metadataPath)}`)
    console.log(`✅ Generated SEMANTICS.md`)

    console.log("\n✨ Done!\n")
  } catch (error) {
    console.error("\n❌ Generation failed:")
    console.error(error)
    process.exit(1)
  }
}

async function runCheck(options: { rootDir: string; outputDir: string }): Promise<void> {
  console.log(`\n📦 Fiction Map Generator — check mode`)
  console.log(`   Root: ${options.rootDir}`)
  console.log("")

  let result: Awaited<ReturnType<typeof checkProject>>
  try {
    result = await checkProject(options)
  } catch (error) {
    console.error("\n❌ Check failed:")
    console.error(error)
    process.exit(1)
  }

  if (result.ok) {
    console.log("✅ Generated artifacts are up to date.\n")
    return
  }

  console.error("❌ Generated artifacts are out of date. Run `fiction-map generate`.")
  for (const mismatch of result.mismatches) {
    const rel = relative(options.rootDir, mismatch.path)
    console.error(`   - ${rel} (${mismatch.reason})`)
  }
  console.error("")
  process.exit(1)
}
