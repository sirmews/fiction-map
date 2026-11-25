import assert from "node:assert/strict"

const playwrightModule = process.env.PLAYWRIGHT_MODULE
assert(playwrightModule, "Set PLAYWRIGHT_MODULE to the pinned Playwright installation's index.mjs")
const { chromium } = await import(playwrightModule)
const dist = new URL("../../../../apps/literature-rpg-web/dist/", import.meta.url)
assert(
  await Bun.file(new URL("index.html", dist)).exists(),
  "Build the Literature RPG web app first",
)

const fixture = await Bun.build({
  entrypoints: [new URL("browser-fixture.ts", import.meta.url).pathname],
  target: "browser",
})
assert(fixture.success && fixture.outputs.length === 1, fixture.logs.join("\n"))

const fixturePath = "/__fiction_map_cutover.js"
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const { pathname } = new URL(request.url)
    if (pathname === fixturePath) {
      return new Response(fixture.outputs[0], { headers: { "Content-Type": "text/javascript" } })
    }
    const url = new URL(pathname === "/" ? "index.html" : `.${pathname}`, dist)
    if (!url.pathname.startsWith(dist.pathname)) return new Response(null, { status: 404 })
    const file = Bun.file(url)
    return (await file.exists()) ? new Response(file) : new Response(null, { status: 404 })
  },
})

try {
  const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL })
  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(10_000)
    const errors: string[] = []
    page.on("pageerror", (error: Error) => errors.push(error.message))
    await page.addInitScript(() => {
      Object.defineProperty(window, "fictionMapWasmExports", { value: [] })
      WebAssembly.Instance = new Proxy(WebAssembly.Instance, {
        construct(Instance, args) {
          const [module, imports] = args
          const exports = WebAssembly.Module.exports(module).map(({ name }) => name)
          if (exports.includes("createInitialState")) {
            Reflect.get(window, "fictionMapWasmExports").push(exports)
          }
          return new Instance(module, imports)
        },
      })
    })
    const response = await page.goto(server.url.href)
    assert(response?.ok(), "Production Literature RPG page loaded")
    await page.getByRole("button", { name: /Approach the grand obsidian doors/ }).click()
    await page.getByRole("button", { name: /Step inside/ }).click()
    await page.getByText("main-hall", { exact: true }).waitFor({ state: "visible" })
    await page.getByText(/Turn: 2$/).waitFor({ state: "visible" })
    await page.getByText(/Brass Lantern$/).waitFor({ state: "visible" })
    const wasmExports: string[][] = await page.evaluate(() =>
      Reflect.get(window, "fictionMapWasmExports"),
    )
    assert(
      wasmExports.some((exports) => exports.includes("deriveEntityState")),
      "The production app instantiated Fiction Map's Rust bindings",
    )

    const savedGamePassed = await page.evaluate(
      async (path: string) => (await import(path)).runBrowserContract(),
      fixturePath,
    )
    assert.equal(savedGamePassed, true)
    assert.deepEqual(errors, [])
    console.log(`Chromium ${browser.version()} passed production gameplay, v1 save, and callbacks.`)
  } finally {
    await browser.close()
  }
} finally {
  await server.stop(true)
}
