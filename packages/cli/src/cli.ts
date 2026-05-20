/**
 * Fiction Map CLI
 */

import { parseArgs } from "util"
import { generate } from "./commands/generate"
import { validate } from "./commands/validate"
import { installHooks } from "./commands/hooks"

const VERSION = "0.1.0"

function printHelp(): void {
  console.log(`
Fiction Map CLI v${VERSION}

Usage:
  fiction-map <command> [options]

Commands:
  generate    Generate metadata.json and SEMANTICS.md from graph definitions
  validate    Validate the current metadata.json against the graph schemas
  hooks       Manage git hooks (e.g. \`fiction-map hooks install\`)

Options:
  --help, -h        Show this help
  --version, -v     Show version

Generate Options:
  --root-dir        Root directory to scan (default: current directory)
  --output-dir      Output directory (default: same as root-dir)
  --check           Exit non-zero if metadata.json or SEMANTICS.md is stale.
                    Does not write any files. Suitable for pre-commit hooks.

Validate Options:
  --root-dir        Root directory (default: current directory)
  --output-dir      Output directory containing .fiction-map/metadata.json
  --strict          Treat warnings as errors

Examples:
  fiction-map generate
  fiction-map generate --check
  fiction-map generate --root-dir ./src --output-dir ./dist
  fiction-map validate
  fiction-map validate --strict
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
      check: { type: "boolean" },
      strict: { type: "boolean" },
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
        check: values.check,
      })
      break

    case "validate":
      await validate({
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
        strict: values.strict,
      })
      break

    case "hooks":
      if (positionals[1] === "install") {
        await installHooks(values["root-dir"])
      } else {
        console.error("Unknown hooks command. Did you mean `fiction-map hooks install`?")
        process.exit(1)
      }
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
