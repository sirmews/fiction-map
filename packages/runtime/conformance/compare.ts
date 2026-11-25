import { deepStrictEqual, equal, ok } from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { GraphDefinition } from "@fiction-map/core"
import Ajv2020 from "ajv/dist/2020"
import { serializeState } from "../src/core/state"
import { builtinEvaluators, builtinHandlers } from "../src/default-bindings"
import type { DerivedEntityState } from "../src/entities/derived"
import { graphDefinitionToBlueprint } from "../src/graph-definition"
import { GraphRuntime } from "../src/runtime"
import type {
  DerivedState,
  EnumerationRequest,
  EnumerationResponse,
  Fixture,
} from "./generated/pathEnumeration"
import schema from "./path-enumeration.schema.json"
import { allBuiltins, differentialCases } from "./scenarios"

const ajv = new Ajv2020({ allowUnionTypes: true, strictRequired: false })
ajv.addSchema(schema, "path-enumeration")
const validateRequest = ajv.compile<EnumerationRequest>({
  $ref: "path-enumeration#/$defs/EnumerationRequest",
})
const validateResponse = ajv.compile<EnumerationResponse>({
  $ref: "path-enumeration#/$defs/EnumerationResponse",
})
const validateFixture = ajv.compile<Fixture>({
  $ref: "path-enumeration#/$defs/Fixture",
})

function decodeContext(state: DerivedState): DerivedEntityState {
  return {
    ownedEntityIds: new Set(state.ownedEntityIds),
    activeEntityIds: new Set(state.activeEntityIds),
    effectiveEntityIds: new Set(state.effectiveEntityIds),
    unlockedEntityIds: new Set(),
    activeModifiers: [],
    prerequisites: [],
    missingEntityIds: new Set(),
  }
}

export function typescriptPaths(request: EnumerationRequest): EnumerationResponse {
  const runtime = new GraphRuntime(request.blueprint)
  for (const trigger of request.triggers ?? []) runtime.addTrigger(trigger)
  const derivedState = request.context?.derivedState
  try {
    const paths = runtime
      .enumeratePaths(
        request.maxDepth,
        request.maxPaths,
        derivedState ? { derivedState: decodeContext(derivedState) } : undefined,
      )
      .map((path) => ({ ...path, state: serializeState(path.state) }))
    // JSON output follows the same omission/number rules as the wire contract.
    return JSON.parse(JSON.stringify({ paths }))
  } catch (error) {
    if (!(error instanceof Error)) throw error
    const code = "code" in error && typeof error.code === "string" ? error.code : error.name
    // Normalize JavaScriptCore's wording for the JSON wire error.
    const message =
      error instanceof TypeError && error.message === "No default value"
        ? "Cannot convert object to primitive value"
        : error.message
    return { error: { code, message } }
  }
}

function assertValid<T>(
  validate: import("ajv").ValidateFunction<T>,
  data: unknown,
  name: string,
): T {
  if (!validate(data)) throw new Error(`${name}: ${ajv.errorsText(validate.errors)}`)
  return data
}

if (import.meta.main) {
  const fixturesDir = new URL("fixtures/", import.meta.url)
  const fixtures = readdirSync(fixturesDir)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) =>
      assertValid(
        validateFixture,
        JSON.parse(readFileSync(new URL(name, fixturesDir), "utf8")),
        name,
      ),
    )
  ok(fixtures.length > 0, "No golden path enumeration fixtures found")
  const testedConditions = new Set(allBuiltins.conditions.map(({ type }) => type))
  const testedEffects = new Set(allBuiltins.effects.map(({ type }) => type))
  deepStrictEqual(
    testedConditions,
    new Set(builtinEvaluators.keys()),
    "Built-in condition coverage",
  )
  deepStrictEqual(testedEffects, new Set(builtinHandlers.keys()), "Built-in effect coverage")

  const appGraph = new URL(
    "../../../apps/literature-rpg/src/graphs/story.graph.ts",
    import.meta.url,
  )
  const { story } = (await import(fileURLToPath(appGraph))) as { story: GraphDefinition }
  const blueprint = graphDefinitionToBlueprint(story)
  const appCases = [4, 8, 12].map((maxDepth) => ({
    name: `Literature RPG at depth ${maxDepth}`,
    request: { blueprint, maxDepth, maxPaths: 30 },
  }))
  const cases = [...fixtures, ...differentialCases(), ...appCases]
  const input = cases.map(({ name, request }) =>
    JSON.stringify(assertValid(validateRequest, request, name)),
  )
  const results = spawnSync(
    "cargo",
    [
      "run",
      "--quiet",
      "--locked",
      "--manifest-path",
      fileURLToPath(new URL("../../runtime-rs/Cargo.toml", import.meta.url)),
    ],
    { input: `${input.join("\n")}\n`, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  )
  if (results.error) throw results.error
  equal(results.status, 0, results.stderr)
  const output = results.stdout.trim().split("\n")
  equal(output.length, cases.length)
  for (const [index, { name }] of cases.entries()) {
    // Decode independent copies so both engines see the same wire input.
    const tsResult = assertValid(validateResponse, typescriptPaths(JSON.parse(input[index])), name)
    const rsResult = assertValid(validateResponse, JSON.parse(output[index]), name)
    deepStrictEqual(rsResult, tsResult, `Rust differs from TypeScript for ${name}`)
    if (index < fixtures.length) {
      deepStrictEqual(tsResult, fixtures[index].expected, `Golden result changed for ${name}`)
    }
  }
  console.log(
    `${fixtures.length} golden fixtures and ${cases.length - fixtures.length} differential cases passed.`,
  )
}
