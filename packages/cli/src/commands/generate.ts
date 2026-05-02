/**
 * Generate command
 * 
 * Usage: fiction-map generate [options]
 */

import { resolve, relative } from "path"
import { generateProject } from "../generator"

export interface GenerateOptions {
  rootDir?: string
  outputDir?: string
}

export async function generate(options: GenerateOptions = {}): Promise<void> {
  const rootDir = resolve(options.rootDir || process.cwd())
  const outputDir = options.outputDir ? resolve(options.outputDir) : rootDir
  
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
