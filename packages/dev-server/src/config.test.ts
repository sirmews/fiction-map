import { describe, expect, test } from "bun:test"
import {
  DEFAULT_DEV_SERVER_DEBOUNCE_MS,
  DEFAULT_DEV_SERVER_PORT,
  resolveDevServerConfig,
} from "./config"

describe("resolveDevServerConfig", () => {
  test("normalizes defaults from cwd with Node path resolution", () => {
    const config = resolveDevServerConfig({
      cwd: "/workspace/app",
    })

    expect(config).toEqual({
      rootDir: "/workspace/app",
      port: DEFAULT_DEV_SERVER_PORT,
      editor: null,
      debounceMs: DEFAULT_DEV_SERVER_DEBOUNCE_MS,
    })
  })

  test("resolves relative root directories canonically", () => {
    const config = resolveDevServerConfig({
      cwd: "/workspace/app",
      rootDir: "../story/./src",
      port: "9500",
      debounceMs: "25",
      editor: " code ",
    })

    expect(config).toEqual({
      rootDir: "/workspace/story/src",
      port: 9500,
      editor: "code",
      debounceMs: 25,
    })
  })

  test("preserves explicit absolute root directories", () => {
    const config = resolveDevServerConfig({
      cwd: "/workspace/app",
      rootDir: "/tmp/project",
    })

    expect(config.rootDir).toBe("/tmp/project")
  })

  test("rejects invalid numeric options", () => {
    expect(() => resolveDevServerConfig({ port: 0 })).toThrow("Invalid dev server port: 0")
    expect(() => resolveDevServerConfig({ debounceMs: -1 })).toThrow("Invalid dev server debounceMs: -1")
    expect(() => resolveDevServerConfig({ port: "1e3" })).toThrow("Invalid dev server port: 1e3")
    expect(() => resolveDevServerConfig({ port: "0x10" })).toThrow("Invalid dev server port: 0x10")
    expect(() => resolveDevServerConfig({ port: "10.5" })).toThrow("Invalid dev server port: 10.5")
    expect(() => resolveDevServerConfig({ debounceMs: "01" })).toThrow("Invalid dev server debounceMs: 01")
    expect(() => resolveDevServerConfig({ debounceMs: "" })).toThrow("Invalid dev server debounceMs: ")
  })

  test("trims string numeric options before validation", () => {
    const config = resolveDevServerConfig({
      port: " 9500 ",
      debounceMs: " 25 ",
    })

    expect(config.port).toBe(9500)
    expect(config.debounceMs).toBe(25)
  })
})
