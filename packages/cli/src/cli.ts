/**
 * Fiction Map CLI
 */

import { parseArgs } from "util"
import { generate } from "./commands/generate"

const VERSION = "0.1.0"

function printHelp(): void {
  console.log(`
Fiction Map CLI v${VERSION}

Usage:
  fiction-map <command> [options]

Commands:
  generate    Generate metadata from graph definitions

Options:
  --help, -h      Show this help
  --version, -v   Show version

Generate Options:
  --root-dir      Root directory to scan (default: current directory)
  --output-dir    Output directory (default: same as root-dir)

Examples:
  fiction-map generate
  fiction-map generate --root-dir ./src
  fiction-map generate --root-dir ./src --output-dir ./dist
`)
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      "root-dir": { type: "string" },
      "output-dir": { type: "string" },
    },
  })
  
  if (values.help) {
    printHelp()
    return
  }
  
  if (values.version) {
    console.log(`fiction-map v${VERSION}`)
    return
  }
  
  const command = positionals[0]
  
  if (!command) {
    printHelp()
    return
  }
  
  switch (command) {
    case "generate":
    case "gen":
      await generate({
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
      })
      break
      
    default:
      console.error(`Unknown command: ${command}`)
      console.error("Run 'fiction-map --help' for usage.")
      process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
