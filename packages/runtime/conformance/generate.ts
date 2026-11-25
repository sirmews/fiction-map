import { readFileSync, writeFileSync } from "node:fs"

interface Schema {
  $ref?: string
  type?: string | string[]
  enum?: (string | number)[]
  items?: Schema
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean | Schema
}

const banner = (schemaName: string) => `// Generated from ${schemaName}. DO NOT EDIT.\n`

function loadDefinitions(schemaFile: URL): Record<string, Schema> {
  const { $defs: definitions } = JSON.parse(readFileSync(schemaFile, "utf8")) as {
    $defs: Record<string, Schema>
  }
  return definitions
}

function snippet(
  schema: Schema,
  language: "typescript" | "rust",
  definitions: Record<string, Schema>,
): string {
  const typescript = language === "typescript"
  if (schema.$ref) {
    const name = schema.$ref.replace("#/$defs/", "")
    if (!Object.hasOwn(definitions, name))
      throw new Error(`Unknown schema reference: ${schema.$ref}`)
    return name
  }
  if (schema.enum && typescript) return schema.enum.map((name) => JSON.stringify(name)).join(" | ")
  if (Array.isArray(schema.type)) {
    const nonNull = schema.type.filter((type) => type !== "null")
    if (schema.type.includes("null") && nonNull.length === 1) {
      const inner = snippet({ type: nonNull[0] }, language, definitions)
      return typescript ? `${inner} | null` : `Option<${inner}>`
    }
    // Multi-type unions have no Rust equivalent; serde_json::Value covers them.
    if (typescript) {
      return schema.type.map((type) => snippet({ type }, language, definitions)).join(" | ")
    }
    return "serde_json::Value"
  }
  // An empty schema (`{}`) means "any": opaque payloads stay untyped.
  if (!schema.type && !schema.properties && !schema.items) {
    return typescript ? "unknown" : "serde_json::Value"
  }
  switch (schema.type) {
    case "array": {
      if (!schema.items) throw new Error("Array schemas must specify items")
      const inner = snippet(schema.items, language, definitions)
      return typescript ? `Array<${inner}>` : `Vec<${inner}>`
    }
    case "object":
      if (schema.additionalProperties && schema.additionalProperties !== true) {
        const inner = snippet(schema.additionalProperties, language, definitions)
        return typescript
          ? `Record<string, ${inner}>`
          : `std::collections::BTreeMap<String, ${inner}>`
      }
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

function typescriptDefinition(
  name: string,
  schema: Schema,
  definitions: Record<string, Schema>,
): string {
  if (!schema.properties)
    return `export type ${name} = ${snippet(schema, "typescript", definitions)}`
  const fields = Object.entries(schema.properties ?? {}).map(([key, value]) => {
    const optional = schema.required?.includes(key) ? "" : "?"
    return `  ${key}${optional}: ${snippet(value, "typescript", definitions)}`
  })
  if (schema.additionalProperties) fields.push("  [key: string]: unknown")
  return [`export interface ${name} {`, ...fields, "}"].join("\n")
}

function rustDefinition(name: string, schema: Schema, definitions: Record<string, Schema>): string {
  if (!schema.properties && schema.type === "object" && schema.additionalProperties === true) {
    return `pub type ${name} = std::collections::BTreeMap<String, Box<serde_json::value::RawValue>>;`
  }
  const fields = Object.entries(schema.properties ?? {}).flatMap(([key, value]) => {
    const field = rustField(key)
    const type = snippet(value, "rust", definitions)
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

interface Target {
  /** Path relative to the schema file's directory. */
  path: string
  render: (name: string, schema: Schema, definitions: Record<string, Schema>) => string
}

interface SchemaSpec {
  schemaFile: string
  targets: Target[]
}

const specs: SchemaSpec[] = [
  {
    schemaFile: "path-enumeration.schema.json",
    targets: [
      { path: "generated/pathEnumeration.ts", render: typescriptDefinition },
      { path: "../../runtime-rs/src/generated/path_enumeration.rs", render: rustDefinition },
    ],
  },
  {
    schemaFile: "journal.schema.json",
    targets: [
      { path: "generated/journal.ts", render: typescriptDefinition },
      { path: "../../runtime-rs/src/generated/journal.rs", render: rustDefinition },
    ],
  },
]

for (const spec of specs) {
  const schemaUrl = new URL(spec.schemaFile, import.meta.url)
  const definitions = loadDefinitions(schemaUrl)
  const header = banner(spec.schemaFile)
  for (const target of spec.targets) {
    const destination = new URL(target.path, schemaUrl)
    const content = `${header}\n${Object.entries(definitions)
      .map(([name, schema]) => target.render(name, schema, definitions))
      .join("\n\n")}\n`
    if (process.argv.includes("--check")) {
      if (readFileSync(destination, "utf8") !== content) {
        console.error(
          `${target.path} is out of date. Run bun run packages/runtime/conformance/generate.ts.`,
        )
        process.exitCode = 1
      }
    } else {
      writeFileSync(destination, content)
    }
  }
}
