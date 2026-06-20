import fs from "node:fs"
import path from "node:path"
import process from "node:process"
import * as ts from "typescript"

type Violation = {
  file: string
  line: number
  message: string
}

const ROOT_DIR = process.cwd()

const TS_HEADLESS_PACKAGES = [
  "packages/cli",
  "packages/core",
  "packages/entities",
  "packages/protocol",
  "packages/runtime",
]

const BANNED_TS_IMPORT_PATTERNS = [
  /^@types\/react$/,
  /^@types\/react-dom$/,
  /^@base-ui\/react$/,
  /^@base-ui\/react\//,
  /^@inkjs\//,
  /^@radix-ui\//,
  /^@tailwindcss\//,
  /^base-ui$/,
  /^charmbracelet\//,
  /^class-variance-authority$/,
  /^clsx$/,
  /^ink$/,
  /^lucide-react$/,
  /^react$/,
  /^react-dom$/,
  /^shadcn$/,
  /^tailwind-merge$/,
  /^tailwindcss$/,
  /^tw-animate-css$/,
  /^@fontsource-/,
]

const BANNED_TS_DEPENDENCY_KEYS = [
  "react",
  "react-dom",
  "@types/react",
  "@types/react-dom",
  "ink",
  "@base-ui/react",
  "class-variance-authority",
  "clsx",
  "lucide-react",
  "tailwind-merge",
  "@tailwindcss/vite",
  "tailwindcss",
]

const GO_CHARMBRACELET_IMPORT_PREFIX = "github.com/charmbracelet/"
const GO_TUI_ALLOWED_DIR = "apps/literature-rpg-tui"

const violations: Violation[] = []

function isIgnoredDirectory(name: string): boolean {
  return [
    "node_modules",
    ".git",
    "dist",
    "coverage",
    ".next",
    ".turbo",
    "bun.lockb",
    ".fiction-map",
  ].includes(name)
}

function listFiles(targetDir: string, extensions: string[] = []): string[] {
  const files: string[] = []

  for (const dirent of fs.readdirSync(targetDir, { withFileTypes: true })) {
    if (isIgnoredDirectory(dirent.name)) {
      continue
    }

    const fullPath = path.join(targetDir, dirent.name)
    if (dirent.isDirectory()) {
      files.push(...listFiles(fullPath, extensions))
      continue
    }

    if (!dirent.isFile()) {
      continue
    }

    if (!extensions.length) {
      files.push(fullPath)
      continue
    }

    const ext = path.extname(dirent.name)
    if (extensions.includes(ext)) {
      files.push(fullPath)
    }
  }

  return files
}

function isBannedTsSpecifier(specifier: string): string | undefined {
  for (const rule of BANNED_TS_IMPORT_PATTERNS) {
    if (rule.test(specifier)) {
      return `Banned presentation-layer import: '${specifier}'`
    }
  }

  return undefined
}

function addViolation(file: string, line: number, message: string) {
  violations.push({ file, line, message })
}

function checkPackageDependencyBoundaries(packageDir: string) {
  const packageJsonPath = path.join(packageDir, "package.json")
  if (!fs.existsSync(packageJsonPath)) {
    return
  }

  const content = fs.readFileSync(packageJsonPath, "utf8")
  const packageJson = JSON.parse(content) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }
  const deps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  }

  const packageJsonRelative = path.relative(ROOT_DIR, packageJsonPath)
  const relativePath = packageJsonRelative || packageJsonPath
  for (const bannedDependency of BANNED_TS_DEPENDENCY_KEYS) {
    if (Object.keys(deps).includes(bannedDependency)) {
      addViolation(
        path.relative(ROOT_DIR, packageJsonPath),
        1,
        `Banned dependency '${bannedDependency}' in ${relativePath}`,
      )
    }
  }
}

function checkTsFilesForBoundaryViolations(packageDir: string) {
  const files = listFiles(path.join(ROOT_DIR, packageDir), [".ts", ".tsx"])
  for (const filePath of files) {
    const sourceText = fs.readFileSync(filePath, "utf8")
    const source = ts.createSourceFile(filePath, sourceText, ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isImportTypeNode(node)
      ) {
        const moduleSpecifier = node.moduleSpecifier
        if (moduleSpecifier && ts.isStringLiteral(moduleSpecifier)) {
          const specifier = moduleSpecifier.text
          const reason = isBannedTsSpecifier(specifier)
          if (reason) {
            const { line } = source.getLineAndCharacterOfPosition(moduleSpecifier.getStart())
            addViolation(path.relative(ROOT_DIR, filePath), line + 1, reason)
          }
        }
      }

      if (ts.isCallExpression(node)) {
        const expression = node.expression
        if (expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments.length > 0) {
          const firstArg = node.arguments[0]
          if (ts.isStringLiteral(firstArg)) {
            const specifier = firstArg.text
            const reason = isBannedTsSpecifier(specifier)
            if (reason) {
              const { line } = source.getLineAndCharacterOfPosition(firstArg.getStart())
              addViolation(path.relative(ROOT_DIR, filePath), line + 1, reason)
            }
          }
        }
      }

      ts.forEachChild(node, visit)
    }
    ts.forEachChild(source, visit)
  }
}

function getLineOffsets(content: string): number[] {
  const offsets: number[] = []
  let index = content.indexOf("\n")
  while (index !== -1) {
    offsets.push(index)
    index = content.indexOf("\n", index + 1)
  }
  return offsets
}

function getLineNumber(content: string, columnOffset: number): number {
  if (columnOffset <= 0) {
    return 1
  }

  let line = 1
  for (let i = 0; i < columnOffset; i += 1) {
    if (content[i] === "\n") {
      line += 1
    }
  }
  return line
}

function checkGoCharmbraceletBoundaries() {
  const goFiles = listFiles(ROOT_DIR, [".go"])
  for (const filePath of goFiles) {
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.includes(GO_TUI_ALLOWED_DIR) && !normalizedPath.includes("packages")) {
      continue
    }

    const content = fs.readFileSync(filePath, "utf8")
    if (!content.includes(GO_CHARMBRACELET_IMPORT_PREFIX)) {
      continue
    }

    const lines = content.split(/\r?\n/g)
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(GO_CHARMBRACELET_IMPORT_PREFIX)) {
        addViolation(
          path.relative(ROOT_DIR, filePath),
          i + 1,
          "Banned non-TUI charmbracelet import in Go source",
        )
      }
    }
  }
}

function run() {
  for (const packageDir of TS_HEADLESS_PACKAGES) {
    checkPackageDependencyBoundaries(path.join(ROOT_DIR, packageDir))
    checkTsFilesForBoundaryViolations(packageDir)
  }

  checkGoCharmbraceletBoundaries()

  if (!violations.length) {
    process.stdout.write("Boundary check passed.\n")
    return
  }

  process.stderr.write("Boundary check failed.\n")
  for (const item of violations) {
    process.stderr.write(`${item.file}:${item.line}: ${item.message}\n`)
  }
  process.exit(1)
}

run()
