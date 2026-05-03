import { resolve } from "node:path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@fiction-map/dev-server": resolve(__dirname, "../dev-server/src/protocol.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
  },
})
