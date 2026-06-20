import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("Architecture Conformance", () => {
  const rootDir = path.resolve(__dirname, "../../..")

  function getFiles(dir: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dir)
    for (const file of files) {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      if (stat.isDirectory()) {
        if (
          file !== "node_modules" &&
          file !== "dist" &&
          file !== "coverage" &&
          file !== ".git" &&
          file !== ".fiction-map"
        ) {
          getFiles(filePath, fileList)
        }
      } else if (file.endsWith(".ts") || file.endsWith(".tsx") || file.endsWith(".go")) {
        fileList.push(filePath)
      }
    }
    return fileList
  }

  it("asserts no hand-written Frame or Intent type declarations exist outside generated/ directories", () => {
    const allFiles = getFiles(rootDir)
    const violations: string[] = []

    // Regex to detect type/interface declarations of Frame or Intent
    const declarationRegex = /\b(interface|type)\s+(Frame|Intent)\b/

    for (const filePath of allFiles) {
      // Exclude generated directories and the schema/generator source files themselves
      const relativePath = path.relative(rootDir, filePath)
      if (
        relativePath.includes("generated/") ||
        relativePath.includes("generated\\") ||
        relativePath.endsWith("schema.ts") ||
        relativePath.endsWith("generator.ts") ||
        relativePath.endsWith("conformance.test.ts")
      ) {
        continue
      }

      const content = fs.readFileSync(filePath, "utf-8")
      if (declarationRegex.test(content)) {
        violations.push(relativePath)
      }
    }

    expect(violations, "Found hand-written Frame/Intent declarations outside generated/").toEqual(
      [],
    )
  })

  it("asserts every file under a generated/ directory carries the DO-NOT-EDIT banner", () => {
    const allFiles = getFiles(rootDir)
    const generatedFiles = allFiles.filter(
      (f) => f.includes("generated/") || f.includes("generated\\"),
    )

    const missingBanner: string[] = []
    const bannerRegex = /DO NOT EDIT/i

    for (const filePath of generatedFiles) {
      const relativePath = path.relative(rootDir, filePath)
      const content = fs.readFileSync(filePath, "utf-8")
      if (!bannerRegex.test(content)) {
        missingBanner.push(relativePath)
      }
    }

    expect(missingBanner, "Generated files missing DO NOT EDIT banner").toEqual([])
  })
})
