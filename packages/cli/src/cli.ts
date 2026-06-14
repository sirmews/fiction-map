#!/usr/bin/env node

/**
 * Fiction Map CLI
 */

import { parseArgs } from "util"
import { generate } from "./commands/generate"
import { validate } from "./commands/validate"
import { installHooks } from "./commands/hooks"
import { explain, query, showGraph } from "./commands/query"
import { ascii } from "./commands/ascii"

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
  query       Read nodes, edges, or static paths from metadata.json
  graph       Show graph-level metadata and topology
  explain     Explain a graph, node, or edge by id
  ascii       Draw a beautiful ASCII map of the story graph

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

Query Options:
  --graph           Limit results to one graph id
  --type            Filter nodes or edges by type
  --from            Filter edges by source node id
  --to              Filter edges by target node id
  --json            Print machine-readable JSON

Ascii Options:
  --root-dir        Root directory (default: current directory)
  --output-dir      Output directory containing .fiction-map/metadata.json
  --format, -f      Output format: terminal, llm, mermaid (default: terminal)

Examples:
  fiction-map generate
  fiction-map generate --check
  fiction-map generate --root-dir ./src --output-dir ./dist
  fiction-map validate
  fiction-map validate --strict
  fiction-map query nodes --graph story
  fiction-map query edges --from entrance
  fiction-map query paths --json
  fiction-map graph show story
  fiction-map explain dark-chapter
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
      graph: { type: "string" },
      type: { type: "string" },
      from: { type: "string" },
      to: { type: "string" },
      json: { type: "boolean" },
      format: { type: "string", short: "f" },
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

    case "query":
      if (positionals[1] === "nodes" || positionals[1] === "edges" || positionals[1] === "paths") {
        await query(positionals[1], {
          rootDir: values["root-dir"],
          outputDir: values["output-dir"],
          graph: values.graph,
          type: values.type,
          from: values.from,
          to: values.to,
          json: values.json,
        })
      } else {
        console.error("Unknown query command. Use `fiction-map query nodes|edges|paths`.")
        process.exit(1)
      }
      break

    case "graph":
      if (positionals[1] === "show") {
        await showGraph(positionals[2], {
          rootDir: values["root-dir"],
          outputDir: values["output-dir"],
          json: values.json,
        })
      } else {
        console.error("Unknown graph command. Use `fiction-map graph show <graph-id>`.")
        process.exit(1)
      }
      break

    case "explain":
      await explain(positionals[1], {
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
        graph: values.graph,
        json: values.json,
      })
      break

    case "ascii":
    case "map":
    case "draw":
      await ascii(positionals[1], {
        rootDir: values["root-dir"],
        outputDir: values["output-dir"],
        format: values.format,
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
