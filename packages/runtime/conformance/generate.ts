import { readFileSync, writeFileSync } from "node:fs"

interface Schema {
  $ref?: string
  type?: string | string[]
  enum?: string[]
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean
}

const schemaFile = new URL("path-enumeration.schema.json", import.meta.url)
const { $defs: definitions } = JSON.parse(readFileSync(schemaFile, "utf8")) as {
  $defs: Record<string, Schema>
}
const banner = "// Generated from path-enumeration.schema.json. DO NOT EDIT.\n"

function snippet(schema: Schema, language: "typescript" | "rust"): string {
  const typescript = language === "typescript"
  if (schema.$ref) {
    const name = schema.$ref.replace("#/$defs/", "")
    if (!Object.hasOwn(definitions, name))
      throw new Error(`Unknown schema reference: ${schema.$ref}`)
    return name
  }
  if (schema.enum && typescript) return schema.enum.map((name) => JSON.stringify(name)).join(" | ")
  if (Array.isArray(schema.type)) {
    if (schema.type.length !== 2 || !schema.type.includes("null")) {
      throw new Error(`Unsupported schema union: ${schema.type}`)
    }
    const inner = snippet({ type: schema.type.find((type) => type !== "null") }, language)
    return typescript ? `${inner} | null` : `Option<${inner}>`
  }
  switch (schema.type) {
    case "array": {
      if (!schema.items) throw new Error("Array schemas must specify items")
      const inner = snippet(schema.items, language)
      return typescript ? `Array<${inner}>` : `Vec<${inner}>`
    }
    case "object":
      if (schema.additionalProperties === true && !schema.properties) {
        return typescript ? "Record<string, unknown>" : "serde_json::Map<String, serde_json::Value>"
      }
      break
    case "string":
      return typescript ? "string" : "String"
    case "boolean":
      return typescript ? "boolean" : "bool"
    case "integer":
      return typescript ? "number" : "u32"
    case "number":
      return typescript ? "number" : "f64"
  }
  throw new Error(`Unsupported schema: ${JSON.stringify(schema)}`)
}

function rustField(name: string): string {
  if (name === "type") return "r#type"
  return name.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`)
}

function typescriptDefinition(name: string, schema: Schema): string {
  if (!schema.properties) return `export type ${name} = ${snippet(schema, "typescript")}`
  const fields = Object.entries(schema.properties ?? {}).map(([key, value]) => {
    const optional = schema.required?.includes(key) ? "" : "?"
    return `  ${key}${optional}: ${snippet(value, "typescript")}`
  })
  if (schema.additionalProperties) fields.push("  [key: string]: unknown")
  return [`export interface ${name} {`, ...fields, "}"].join("\n")
}

function rustDefinition(name: string, schema: Schema): string {
  if (!schema.properties && schema.type === "object" && schema.additionalProperties) {
    return `pub type ${name} = std::collections::BTreeMap<String, Box<serde_json::value::RawValue>>;`
  }
  const fields = Object.entries(schema.properties ?? {}).flatMap(([key, value]) => {
    const field = rustField(key)
    const type = snippet(value, "rust")
    return schema.required?.includes(key)
      ? [`    pub ${field}: ${type},`]
      : [
          '    #[serde(skip_serializing_if = "Option::is_none")]',
          `    pub ${field}: Option<${type}>,`,
        ]
  })
  if (schema.additionalProperties) {
    fields.push(
      "    #[serde(flatten)]",
      "    pub params: serde_json::Map<String, serde_json::Value>,",
    )
  }
  const rename = schema.additionalProperties
    ? '#[serde(rename_all = "camelCase")]'
    : '#[serde(rename_all = "camelCase", deny_unknown_fields)]'
  return [
    "#[derive(Debug, Clone, serde::Deserialize, serde::Serialize)]",
    rename,
    `pub struct ${name} {`,
    ...fields,
    "}",
  ].join("\n")
}

const targets = [
  ["generated/pathEnumeration.ts", typescriptDefinition],
  ["../../runtime-rs/src/generated/path_enumeration.rs", rustDefinition],
] as const

for (const [relativePath, render] of targets) {
  const destination = new URL(relativePath, schemaFile)
  const content = `${banner}\n${Object.entries(definitions)
    .map(([name, schema]) => render(name, schema))
    .join("\n\n")}\n`
  if (process.argv.includes("--check")) {
    if (readFileSync(destination, "utf8") !== content) {
      console.error(
        `${relativePath} is out of date. Run bun run packages/runtime/conformance/generate.ts.`,
      )
      process.exitCode = 1
    }
  } else {
    writeFileSync(destination, content)
  }
}
