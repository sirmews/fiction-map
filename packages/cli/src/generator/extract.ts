/**
 * Metadata extraction from source files
 * 
 * Extracts:
 * - JSDoc @description
 * - JSDoc @ai-rule
 * - Property schemas
 * - Source locations
 */

import * as ts from "typescript"
import { relative } from "path"
import type { 
  NodeTypeDefinition, 
  EdgeTypeDefinition,
  ConditionDefinition,
  EffectDefinition,
  GraphDefinition,
  NodeInstance,
  EdgeInstance,
  PropertySchema,
  PropertyDefinition,
  SourceLocation,
} from "@fiction-map/core"

interface ExtractedJSDoc {
  description?: string
  aiRule?: string
}

/**
 * Extract JSDoc comments from leading comments
 */
function extractLeadingJSDoc(node: ts.Node, sourceFile: ts.SourceFile): ExtractedJSDoc {
  const result: ExtractedJSDoc = {}
  
  // Get the parent to find comments before the export statement
  let targetNode = node
  let parent = node.parent
  
  // Walk up to find the variable declaration or export statement
  while (parent) {
    if (ts.isVariableDeclaration(parent) || ts.isVariableStatement(parent)) {
      targetNode = parent
      break
    }
    if (ts.isExportDeclaration(parent) || ts.isVariableDeclarationList(parent)) {
      targetNode = parent
      break
    }
    parent = parent.parent
  }
  
  const fullText = sourceFile.getFullText()
  const nodeStart = targetNode.getStart(sourceFile)
  
  // Get the text before the node
  const textBefore = fullText.substring(0, nodeStart)
  
  // Find the last comment block before the node
  const commentMatches = textBefore.match(/\/\*\*[\s\S]*?\*\//g)
  if (!commentMatches) return result
  
  const lastComment = commentMatches[commentMatches.length - 1]
  
  const descMatch = lastComment.match(/@description\s+(.+)/)
  if (descMatch) {
    result.description = descMatch[1].trim()
  }
  
  const ruleMatch = lastComment.match(/@ai-rule\s+(.+)/)
  if (ruleMatch) {
    result.aiRule = ruleMatch[1].trim()
  }
  
  return result
}

/**
 * Get source location for a node
 */
function getSourceLocation(node: ts.Node, sourceFile: ts.SourceFile): SourceLocation {
  const pos = node.getStart(sourceFile)
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(pos)
  
  return {
    file: sourceFile.fileName,
    line: line + 1,
    column: character + 1,
  }
}

/**
 * Parse property schema from object literal
 */
function parsePropertySchema(node: ts.Node, sourceFile: ts.SourceFile): PropertySchema | null {
  if (!ts.isObjectLiteralExpression(node)) return null
  
  const schema: PropertySchema = { type: "string" }
  
  for (const prop of node.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    
    const name = prop.name.getText(sourceFile)
    const value = prop.initializer
    
    switch (name) {
      case "type":
        if (ts.isStringLiteral(value)) {
          schema.type = value.text as PropertySchema["type"]
        }
        break
      case "required":
        if (value.getText(sourceFile) === "true") {
          schema.required = true
        }
        break
      case "default":
        if (ts.isStringLiteral(value)) {
          schema.default = value.text
        } else if (ts.isNumericLiteral(value)) {
          schema.default = parseFloat(value.text)
        } else if (value.getText(sourceFile) === "true" || value.getText(sourceFile) === "false") {
          schema.default = value.getText(sourceFile) === "true"
        }
        break
      case "values":
        if (ts.isArrayLiteralExpression(value)) {
          schema.values = value.elements.map(e => e.getText(sourceFile).replace(/['"]/g, ""))
        }
        break
    }
  }
  
  return schema
}

/**
 * Extract properties from a config object
 */
function extractObjectProperties(obj: ts.ObjectLiteralExpression, sourceFile: ts.SourceFile): PropertyDefinition {
  const properties: PropertyDefinition = {}
  
  for (const propDef of obj.properties) {
    if (!ts.isPropertyAssignment(propDef)) continue
    
    const propName = propDef.name.getText(sourceFile)
    const schema = parsePropertySchema(propDef.initializer, sourceFile)
    
    if (schema) {
      properties[propName] = schema
    }
  }
  
  return properties
}

/**
 * Extract config object property
 */
function extractConfigProperty(
  callExpr: ts.CallExpression, 
  propertyName: string, 
  sourceFile: ts.SourceFile
): PropertyDefinition {
  const properties: PropertyDefinition = {}
  
  const arg = callExpr.arguments[callExpr.arguments.length - 1]
  if (!arg || !ts.isObjectLiteralExpression(arg)) return properties
  
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    if (prop.name.getText(sourceFile) !== propertyName) continue
    
    const propsObj = prop.initializer
    if (!ts.isObjectLiteralExpression(propsObj)) continue
    
    return extractObjectProperties(propsObj, sourceFile)
  }
  
  return properties
}

/**
 * Extract string array from call expression property
 */
function extractStringArray(callExpr: ts.CallExpression, propName: string, sourceFile: ts.SourceFile): string[] {
  const result: string[] = []
  
  const arg = callExpr.arguments[callExpr.arguments.length - 1]
  if (!arg || !ts.isObjectLiteralExpression(arg)) return result
  
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    if (prop.name.getText(sourceFile) !== propName) continue
    
    const arr = prop.initializer
    if (!ts.isArrayLiteralExpression(arr)) continue
    
    for (const elem of arr.elements) {
      if (ts.isStringLiteral(elem)) {
        result.push(elem.text)
      }
    }
  }
  
  return result
}

/**
 * Extract id from call expression
 */
function extractId(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): string | null {
  const arg = callExpr.arguments[callExpr.arguments.length - 1]
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null
  
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    if (prop.name.getText(sourceFile) !== "id") continue
    
    if (ts.isStringLiteral(prop.initializer)) {
      return prop.initializer.text
    }
  }
  
  return null
}

/**
 * Create a TypeScript program for parsing
 */
function createProgram(filePath: string): ts.Program {
  return ts.createProgram([filePath], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  })
}

/**
 * Extract node type definition from file
 */
export function extractNodeType(filePath: string, rootDir: string): NodeTypeDefinition | null {
  const program = createProgram(filePath)
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) return null
  
  let definition: NodeTypeDefinition | null = null
  const sf = sourceFile
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression
      if (ts.isIdentifier(expr) && expr.text === "defineNodeType") {
        const id = extractId(node, sf)
        if (!id) return
        
        const jsDoc = extractLeadingJSDoc(node, sf)
        const location = getSourceLocation(node, sf)
        location.file = relative(rootDir, location.file)
        
        definition = {
          id,
          name: id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Node",
          location,
          description: jsDoc.description,
          aiRule: jsDoc.aiRule,
          properties: extractConfigProperty(node, "properties", sf),
          outgoingEdges: extractStringArray(node, "outgoingEdges", sf),
          incomingEdges: extractStringArray(node, "incomingEdges", sf),
        }
      }
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sf)
  return definition
}

/**
 * Extract edge type definition from file
 */
export function extractEdgeType(filePath: string, rootDir: string): EdgeTypeDefinition | null {
  const program = createProgram(filePath)
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) return null
  
  let definition: EdgeTypeDefinition | null = null
  const sf = sourceFile
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression
      if (ts.isIdentifier(expr) && expr.text === "defineEdgeType") {
        const id = extractId(node, sf)
        if (!id) return
        
        const jsDoc = extractLeadingJSDoc(node, sf)
        const location = getSourceLocation(node, sf)
        location.file = relative(rootDir, location.file)
        
        definition = {
          id,
          name: id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Edge",
          location,
          description: jsDoc.description,
          aiRule: jsDoc.aiRule,
          properties: extractConfigProperty(node, "properties", sf),
          sourceTypes: extractStringArray(node, "sourceTypes", sf),
          targetTypes: extractStringArray(node, "targetTypes", sf),
        }
      }
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sf)
  return definition
}

/**
 * Extract condition definition from file
 */
export function extractCondition(filePath: string, rootDir: string): ConditionDefinition | null {
  const program = createProgram(filePath)
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) return null
  
  let definition: ConditionDefinition | null = null
  const sf = sourceFile
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression
      if (ts.isIdentifier(expr) && expr.text === "defineCondition") {
        const id = extractId(node, sf)
        if (!id) return
        
        const jsDoc = extractLeadingJSDoc(node, sf)
        const location = getSourceLocation(node, sf)
        location.file = relative(rootDir, location.file)
        
        definition = {
          id,
          name: id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Condition",
          location,
          description: jsDoc.description,
          aiRule: jsDoc.aiRule,
          parameters: extractConfigProperty(node, "parameters", sf),
        }
      }
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sf)
  return definition
}

/**
 * Extract effect definition from file
 */
export function extractEffect(filePath: string, rootDir: string): EffectDefinition | null {
  const program = createProgram(filePath)
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) return null
  
  let definition: EffectDefinition | null = null
  const sf = sourceFile
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression
      if (ts.isIdentifier(expr) && expr.text === "defineEffect") {
        const id = extractId(node, sf)
        if (!id) return
        
        const jsDoc = extractLeadingJSDoc(node, sf)
        const location = getSourceLocation(node, sf)
        location.file = relative(rootDir, location.file)
        
        definition = {
          id,
          name: id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Effect",
          location,
          description: jsDoc.description,
          aiRule: jsDoc.aiRule,
          parameters: extractConfigProperty(node, "parameters", sf),
        }
      }
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sf)
  return definition
}

/**
 * Extract graph definition from file
 */
export function extractGraph(filePath: string, rootDir: string): GraphDefinition | null {
  const program = createProgram(filePath)
  const sourceFile = program.getSourceFile(filePath)
  if (!sourceFile) return null
  
  let definition: GraphDefinition | null = null
  const sf = sourceFile
  
  function visit(node: ts.Node) {
    if (ts.isCallExpression(node)) {
      const expr = node.expression
      if (ts.isIdentifier(expr) && expr.text === "defineGraph") {
        const id = extractId(node, sf)
        if (!id) return
        
        const jsDoc = extractLeadingJSDoc(node, sf)
        const location = getSourceLocation(node, sf)
        location.file = relative(rootDir, location.file)
        
        const nodes = extractNodesArray(node, sf)
        const edges = extractEdgesArray(node, sf)
        
        definition = {
          id,
          name: id.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + "Graph",
          location,
          description: jsDoc.description,
          nodes,
          edges,
          nodeCount: nodes.length,
          edgeCount: edges.length,
          maxDepth: 0,
          endings: [],
          nodeTypesUsed: [...new Set(nodes.map(n => n.type))],
          edgeTypesUsed: [...new Set(edges.map(e => e.type))],
          conditionsUsed: [],
          effectsUsed: [],
          errors: [],
          warnings: [],
        }
      }
    }
    
    ts.forEachChild(node, visit)
  }
  
  visit(sf)
  return definition
}

/**
 * Extract nodes array from defineGraph call
 */
function extractNodesArray(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): NodeInstance[] {
  const result: NodeInstance[] = []
  const nodes = extractArrayProperty(callExpr, "nodes", sourceFile)
  
  if (!nodes || !ts.isArrayLiteralExpression(nodes)) return result
  
  for (const elem of nodes.elements) {
    if (!ts.isObjectLiteralExpression(elem)) continue
    
    const node: NodeInstance = { id: "", type: "" }
    
    for (const prop of elem.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = prop.name.getText(sourceFile)
      
      if (name === "id" && ts.isStringLiteral(prop.initializer)) {
        node.id = prop.initializer.text
      } else if (name === "type" && ts.isStringLiteral(prop.initializer)) {
        node.type = prop.initializer.text
      } else {
        const value = extractValue(prop.initializer, sourceFile)
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
function extractEdgesArray(callExpr: ts.CallExpression, sourceFile: ts.SourceFile): EdgeInstance[] {
  const result: EdgeInstance[] = []
  const edges = extractArrayProperty(callExpr, "edges", sourceFile)
  
  if (!edges || !ts.isArrayLiteralExpression(edges)) return result
  
  for (const elem of edges.elements) {
    if (!ts.isObjectLiteralExpression(elem)) continue
    
    const edge: EdgeInstance = { id: "", type: "", source: "", target: "" }
    
    for (const prop of elem.properties) {
      if (!ts.isPropertyAssignment(prop)) continue
      const name = prop.name.getText(sourceFile)
      
      if (name === "id" && ts.isStringLiteral(prop.initializer)) {
        edge.id = prop.initializer.text
      } else if (name === "type" && ts.isStringLiteral(prop.initializer)) {
        edge.type = prop.initializer.text
      } else if (name === "source" && ts.isStringLiteral(prop.initializer)) {
        edge.source = prop.initializer.text
      } else if (name === "target" && ts.isStringLiteral(prop.initializer)) {
        edge.target = prop.initializer.text
      } else {
        const value = extractValue(prop.initializer, sourceFile)
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
function extractArrayProperty(callExpr: ts.CallExpression, propName: string, sourceFile: ts.SourceFile): ts.ArrayLiteralExpression | null {
  const arg = callExpr.arguments[callExpr.arguments.length - 1]
  if (!arg || !ts.isObjectLiteralExpression(arg)) return null
  
  for (const prop of arg.properties) {
    if (!ts.isPropertyAssignment(prop)) continue
    if (prop.name.getText(sourceFile) !== propName) continue
    
    if (ts.isArrayLiteralExpression(prop.initializer)) {
      return prop.initializer
    }
  }
  
  return null
}

/**
 * Extract a value from an expression
 */
function extractValue(expr: ts.Expression, sourceFile: ts.SourceFile): unknown {
  if (ts.isStringLiteral(expr)) {
    return expr.text
  }
  if (ts.isNumericLiteral(expr)) {
    return Number(expr.text)
  }
  if (expr.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (expr.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
  if (expr.kind === ts.SyntaxKind.NullKeyword) {
    return null
  }
  if (ts.isArrayLiteralExpression(expr)) {
    return expr.elements.map(e => extractValue(e, sourceFile))
  }
  if (ts.isObjectLiteralExpression(expr)) {
    const obj: Record<string, unknown> = {}
    for (const prop of expr.properties) {
      if (ts.isPropertyAssignment(prop)) {
        const name = prop.name.getText(sourceFile)
        obj[name] = extractValue(prop.initializer, sourceFile)
      }
    }
    return obj
  }
  return undefined
}
