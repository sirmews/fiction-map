/**
 * Metadata extraction from source files
 *
 * Extracts:
 * - JSDoc @description
 * - JSDoc @ai-rule
 * - Property schemas
 * - Source locations
 */

import { relative } from "node:path"
import type {
  ConditionDefinition,
  EdgeInstance,
  EdgeTypeDefinition,
  EffectDefinition,
  GraphDefinition,
  NodeInstance,
  NodeTypeDefinition,
  PropertyDefinition,
  PropertySchema,
  SourceLocation,
  StructDefinition,
} from "@fiction-map/core"
import { type CallExpression, Node, Project, type SourceFile, SyntaxKind } from "ts-morph"

const project = new Project()

function getSourceFile(filePath: string): SourceFile | null {
  try {
    const existing = project.getSourceFile(filePath)
    if (existing) {
      project.removeSourceFile(existing)
    }
    return project.addSourceFileAtPath(filePath)
  } catch {
    return null
  }
}

interface ExtractedJSDoc {
  description?: string
  aiRule?: string
}

/**
 * Extract JSDoc comments from leading comments
 */
function extractLeadingJSDoc(node: Node): ExtractedJSDoc {
  const result: ExtractedJSDoc = {}

  const variableStatement = node.getFirstAncestorByKind(SyntaxKind.VariableStatement)
  if (!variableStatement) return result

  const jsDocs = variableStatement.getJsDocs()
  if (jsDocs.length === 0) return result

  const jsDoc = jsDocs[jsDocs.length - 1]
  const tags = jsDoc.getTags()

  for (const tag of tags) {
    const tagName = tag.getTagName()
    if (tagName === "description") {
      const match = tag.getText().match(/@description\s+([\s\S]+)/)
      if (match) {
        result.description = match[1].replace(/[\r\n\s*]+$/, "").trim()
      }
    } else if (tagName === "ai-rule") {
      const match = tag.getText().match(/@ai-rule\s+([\s\S]+)/)
      if (match) {
        result.aiRule = match[1].replace(/[\r\n\s*]+$/, "").trim()
      }
    }
  }

  return result
}

/**
 * Get source location for a node
 */
function getSourceLocation(node: Node, sourceFile: SourceFile): SourceLocation {
  const pos = node.getStart()
  const { line, character } = sourceFile.compilerNode.getLineAndCharacterOfPosition(pos)

  return {
    file: sourceFile.getFilePath(),
    line: line + 1,
    column: character + 1,
  }
}

/**
 * Parse property schema from object literal
 */
function parsePropertySchema(node: Node): PropertySchema | null {
  if (!Node.isObjectLiteralExpression(node)) return null

  const schema: PropertySchema = { type: "string" }

  for (const prop of node.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue

    const name = prop.getName()
    const value = prop.getInitializer()
    if (!value) continue

    switch (name) {
      case "type":
        if (Node.isStringLiteral(value)) {
          schema.type = value.getLiteralValue() as PropertySchema["type"]
        }
        break
      case "required":
        if (value.getText() === "true") {
          schema.required = true
        }
        break
      case "default":
        if (Node.isStringLiteral(value)) {
          schema.default = value.getLiteralValue()
        } else if (Node.isNumericLiteral(value)) {
          schema.default = value.getLiteralValue()
        } else if (value.getText() === "true" || value.getText() === "false") {
          schema.default = value.getText() === "true"
        }
        break
      case "values":
        if (Node.isArrayLiteralExpression(value)) {
          schema.values = value.getElements().map((e) => e.getText().replace(/['"]/g, ""))
        }
        break
      case "structId":
        if (Node.isStringLiteral(value)) {
          schema.structId = value.getLiteralValue()
        }
        break
      case "items": {
        const parsed = parsePropertySchema(value)
        if (parsed) {
          schema.items = parsed
        }
        break
      }
      case "keyType":
        if (Node.isStringLiteral(value)) {
          schema.keyType = value.getLiteralValue() as PropertySchema["keyType"]
        }
        break
      case "valueType": {
        const parsed = parsePropertySchema(value)
        if (parsed) {
          schema.valueType = parsed
        }
        break
      }
      case "referenceTo":
        if (Node.isStringLiteral(value)) {
          schema.referenceTo = value.getLiteralValue()
        }
        break
    }
  }

  return schema
}

/**
 * Extract properties from a config object
 */
function extractObjectProperties(obj: Node): PropertyDefinition {
  const properties: PropertyDefinition = {}
  if (!Node.isObjectLiteralExpression(obj)) return properties

  for (const propDef of obj.getProperties()) {
    if (!Node.isPropertyAssignment(propDef)) continue

    const propName = propDef.getName()
    const initializer = propDef.getInitializer()
    if (!initializer) continue

    const schema = parsePropertySchema(initializer)
    if (schema) {
      properties[propName] = schema
    }
  }

  return properties
}

/**
 * Extract config object property
 */
function extractConfigProperty(callExpr: CallExpression, propertyName: string): PropertyDefinition {
  const properties: PropertyDefinition = {}

  const args = callExpr.getArguments()
  const arg = args[args.length - 1]
  if (!arg || !Node.isObjectLiteralExpression(arg)) return properties

  const prop = arg.getProperty(propertyName)
  if (!prop || !Node.isPropertyAssignment(prop)) return properties

  const propsObj = prop.getInitializer()
  if (!propsObj || !Node.isObjectLiteralExpression(propsObj)) return properties

  return extractObjectProperties(propsObj)
}

/**
 * Extract string array from call expression property
 */
function extractStringArray(callExpr: CallExpression, propName: string): string[] {
  const result: string[] = []

  const args = callExpr.getArguments()
  const arg = args[args.length - 1]
  if (!arg || !Node.isObjectLiteralExpression(arg)) return result

  const prop = arg.getProperty(propName)
  if (!prop || !Node.isPropertyAssignment(prop)) return result

  const arr = prop.getInitializer()
  if (!arr || !Node.isArrayLiteralExpression(arr)) return result

  for (const elem of arr.getElements()) {
    if (Node.isStringLiteral(elem)) {
      result.push(elem.getLiteralValue())
    }
  }

  return result
}

/**
 * Extract id from call expression
 */
function extractId(callExpr: CallExpression): string | null {
  const args = callExpr.getArguments()
  const arg = args[args.length - 1]
  if (!arg || !Node.isObjectLiteralExpression(arg)) return null

  const prop = arg.getProperty("id")
  if (!prop || !Node.isPropertyAssignment(prop)) return null

  const initializer = prop.getInitializer()
  if (initializer && Node.isStringLiteral(initializer)) {
    return initializer.getLiteralValue()
  }

  return null
}

/**
 * Extract node type definition from file
 */
export function extractNodeType(filePath: string, rootDir: string): NodeTypeDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: NodeTypeDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineNodeType") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      const args = callExpr.getArguments()
      const arg = args[args.length - 1]
      let autoResolve = false
      if (arg && Node.isObjectLiteralExpression(arg)) {
        const autoResolveProp = arg.getProperty("autoResolve")
        if (autoResolveProp && Node.isPropertyAssignment(autoResolveProp)) {
          const init = autoResolveProp.getInitializer()
          if (init && init.getText() === "true") {
            autoResolve = true
          }
        }
      }

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Node`,
        location,
        description: jsDoc.description,
        aiRule: jsDoc.aiRule,
        properties: extractConfigProperty(callExpr, "properties"),
        outgoingEdges: extractStringArray(callExpr, "outgoingEdges"),
        incomingEdges: extractStringArray(callExpr, "incomingEdges"),
        autoResolve,
      }
      break
    }
  }

  return definition
}

/**
 * Extract struct definition from file
 */
export function extractStruct(filePath: string, rootDir: string): StructDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: StructDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineStruct") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Struct`,
        location,
        description: jsDoc.description,
        properties: extractConfigProperty(callExpr, "properties"),
      }
      break
    }
  }

  return definition
}

/**
 * Extract edge type definition from file
 */
export function extractEdgeType(filePath: string, rootDir: string): EdgeTypeDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: EdgeTypeDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineEdgeType") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Edge`,
        location,
        description: jsDoc.description,
        aiRule: jsDoc.aiRule,
        properties: extractConfigProperty(callExpr, "properties"),
        sourceTypes: extractStringArray(callExpr, "sourceTypes"),
        targetTypes: extractStringArray(callExpr, "targetTypes"),
      }
      break
    }
  }

  return definition
}

/**
 * Extract condition definition from file
 */
export function extractCondition(filePath: string, rootDir: string): ConditionDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: ConditionDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineCondition") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Condition`,
        location,
        description: jsDoc.description,
        aiRule: jsDoc.aiRule,
        parameters: extractConfigProperty(callExpr, "parameters"),
      }
      break
    }
  }

  return definition
}

/**
 * Extract effect definition from file
 */
export function extractEffect(filePath: string, rootDir: string): EffectDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: EffectDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineEffect") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Effect`,
        location,
        description: jsDoc.description,
        aiRule: jsDoc.aiRule,
        parameters: extractConfigProperty(callExpr, "parameters"),
      }
      break
    }
  }

  return definition
}

/**
 * Extract graph definition from file
 */
export function extractGraph(filePath: string, rootDir: string): GraphDefinition | null {
  const sourceFile = getSourceFile(filePath)
  if (!sourceFile) return null

  let definition: GraphDefinition | null = null

  for (const callExpr of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const expr = callExpr.getExpression()
    if (Node.isIdentifier(expr) && expr.getText() === "defineGraph") {
      const id = extractId(callExpr)
      if (!id) continue

      const jsDoc = extractLeadingJSDoc(callExpr)
      const location = getSourceLocation(callExpr, sourceFile)
      location.file = relative(rootDir, location.file)

      const nodes = extractNodesArray(callExpr)
      const edges = extractEdgesArray(callExpr)

      definition = {
        id,
        name: `${id.replace(/-([a-z])/g, (_, c) => c.toUpperCase())}Graph`,
        location,
        description: jsDoc.description,
        nodes,
        edges,
        nodeCount: nodes.length,
        edgeCount: edges.length,
        maxDepth: 0,
        endings: [],
        nodeTypesUsed: [...new Set(nodes.map((n) => n.type))],
        edgeTypesUsed: [...new Set(edges.map((e) => e.type))],
        conditionsUsed: [],
        effectsUsed: [],
        errors: [],
        warnings: [],
      }
      break
    }
  }

  return definition
}

/**
 * Extract nodes array from defineGraph call
 */
function extractNodesArray(callExpr: CallExpression): NodeInstance[] {
  const result: NodeInstance[] = []
  const nodes = extractArrayProperty(callExpr, "nodes")

  if (!nodes || !Node.isArrayLiteralExpression(nodes)) return result

  for (const elem of nodes.getElements()) {
    if (!Node.isObjectLiteralExpression(elem)) continue

    const node: NodeInstance = { id: "", type: "" }

    for (const prop of elem.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue
      const name = prop.getName()
      const initializer = prop.getInitializer()
      if (!initializer) continue

      if (name === "id" && Node.isStringLiteral(initializer)) {
        node.id = initializer.getLiteralValue()
      } else if (name === "type" && Node.isStringLiteral(initializer)) {
        node.type = initializer.getLiteralValue()
      } else {
        const value = extractValue(initializer)
        if (value !== undefined) {
          node[name] = value
        }
      }
    }

    if (node.id && node.type) {
      result.push(node)
    }
  }

  return result
}

/**
 * Extract edges array from defineGraph call
 */
function extractEdgesArray(callExpr: CallExpression): EdgeInstance[] {
  const result: EdgeInstance[] = []
  const edges = extractArrayProperty(callExpr, "edges")

  if (!edges || !Node.isArrayLiteralExpression(edges)) return result

  for (const elem of edges.getElements()) {
    if (!Node.isObjectLiteralExpression(elem)) continue

    const edge: EdgeInstance = { id: "", type: "", source: "", target: "" }

    for (const prop of elem.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue
      const name = prop.getName()
      const initializer = prop.getInitializer()
      if (!initializer) continue

      if (name === "id" && Node.isStringLiteral(initializer)) {
        edge.id = initializer.getLiteralValue()
      } else if (name === "type" && Node.isStringLiteral(initializer)) {
        edge.type = initializer.getLiteralValue()
      } else if (name === "source" && Node.isStringLiteral(initializer)) {
        edge.source = initializer.getLiteralValue()
      } else if (name === "target" && Node.isStringLiteral(initializer)) {
        edge.target = initializer.getLiteralValue()
      } else {
        const value = extractValue(initializer)
        if (value !== undefined) {
          edge[name] = value
        }
      }
    }

    if (edge.id && edge.type && edge.source && edge.target) {
      result.push(edge)
    }
  }

  return result
}

/**
 * Extract array property from object literal
 */
function extractArrayProperty(callExpr: CallExpression, propName: string): Node | null {
  const args = callExpr.getArguments()
  const arg = args[args.length - 1]
  if (!arg || !Node.isObjectLiteralExpression(arg)) return null

  const prop = arg.getProperty(propName)
  if (!prop || !Node.isPropertyAssignment(prop)) return null

  const initializer = prop.getInitializer()
  if (initializer && Node.isArrayLiteralExpression(initializer)) {
    return initializer
  }

  return null
}

/**
 * Extract a value from an expression
 */
function extractValue(expr: Node): unknown {
  if (Node.isStringLiteral(expr)) {
    return expr.getLiteralValue()
  }
  if (Node.isNumericLiteral(expr)) {
    return expr.getLiteralValue()
  }
  if (expr.getKind() === SyntaxKind.TrueKeyword) {
    return true
  }
  if (expr.getKind() === SyntaxKind.FalseKeyword) {
    return false
  }
  if (expr.getKind() === SyntaxKind.NullKeyword) {
    return null
  }
  if (Node.isArrayLiteralExpression(expr)) {
    return expr.getElements().map((e) => extractValue(e))
  }
  if (Node.isObjectLiteralExpression(expr)) {
    const obj: Record<string, unknown> = {}
    for (const prop of expr.getProperties()) {
      if (Node.isPropertyAssignment(prop)) {
        const name = prop.getName()
        const initializer = prop.getInitializer()
        if (initializer) {
          obj[name] = extractValue(initializer)
        }
      }
    }
    return obj
  }
  return undefined
}
