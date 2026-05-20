import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { mkdir, writeFile, readFile, rm } from "fs/promises"
import { join } from "path"
import { installHooks } from "./hooks"

const TEST_DIR = join(__dirname, "hooks-fixtures")

describe("hooks install command", () => {
  beforeEach(async () => {
    await mkdir(TEST_DIR, { recursive: true })
  })

  afterEach(async () => {
    vi.restoreAllMocks()
    await rm(TEST_DIR, { recursive: true, force: true })
  })

  it("exits if .git is missing", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const exitSpy = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`process.exit(${code ?? ""})`)
    }) as never

    await expect(installHooks(TEST_DIR)).rejects.toThrow("process.exit(1)")
    expect(exitSpy).toHaveBeenCalledWith(1)
    expect(errorSpy.mock.calls.some((c) => String(c[0]).includes("No .git directory found"))).toBe(true)
  })

  it("creates a new hook if none exists", async () => {
    const gitDir = join(TEST_DIR, ".git")
    await mkdir(gitDir, { recursive: true })

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await installHooks(TEST_DIR)

    const hookContent = await readFile(join(gitDir, "hooks", "pre-commit"), "utf8")
    expect(hookContent).toContain("Fiction Map pre-commit hook")
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Installed Fiction Map pre-commit hook"))).toBe(true)
  })

  it("appends to an existing hook", async () => {
    const gitDir = join(TEST_DIR, ".git")
    await mkdir(join(gitDir, "hooks"), { recursive: true })
    const hookPath = join(gitDir, "hooks", "pre-commit")

    await writeFile(hookPath, "#!/usr/bin/env bash\\necho 'existing'\\n")

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await installHooks(TEST_DIR)

    const hookContent = await readFile(hookPath, "utf8")
    expect(hookContent).toContain("echo 'existing'")
    expect(hookContent).toContain("Fiction Map pre-commit hook")
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("Appended Fiction Map to existing"))).toBe(true)
  })

  it("does not append if already installed", async () => {
    const gitDir = join(TEST_DIR, ".git")
    await mkdir(join(gitDir, "hooks"), { recursive: true })
    const hookPath = join(gitDir, "hooks", "pre-commit")

    await writeFile(hookPath, "#!/usr/bin/env bash\\n# Fiction Map pre-commit hook\\necho 'already here'\\n")

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})

    await installHooks(TEST_DIR)

    const hookContent = await readFile(hookPath, "utf8")
    // Ensure it wasn't doubled
    expect(hookContent.match(/Fiction Map pre-commit hook/g)?.length).toBe(1)
    expect(logSpy.mock.calls.some((c) => String(c[0]).includes("already installed"))).toBe(true)
  })
})
