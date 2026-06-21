import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "@dagger.io/dagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runPipeline() {
  console.log("🚀 Starting Fiction Map Local CI Pipeline via Dagger...");

  await connect(
    async (client) => {
      // 1. Mount the host repository directory (excluding node_modules and build artifacts)
      const sourceDir = client
        .host()
        .directory(path.resolve(__dirname, "../../.."), {
          exclude: [
            "node_modules",
            "packages/*/node_modules",
            "apps/*/node_modules",
            "packages/*/dist",
            "apps/*/dist",
            "apps/literature-rpg-web/dist",
            "bun.lock",
            ".git",
          ],
        });

      // --- Container 1: Bun Environment (Lint, Typecheck, Test, Protocol, Metadata) ---
      console.log("📦 Configuring Bun container...");
      let bunContainer = client
        .container()
        .from("oven/bun:1.3.14")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        .withExec(["bun", "install"])
        .withExec(["bun", "run", "build"])
        .withExec(["bun", "run", "check"])
        .withExec(["bun", "run", "lint:boundaries"])
        .withExec(["bun", "run", "typecheck"])
        .withExec(["bun", "test"])
        .withExec(["sh", "-c", "cd packages/protocol && bun run generate --check"])
        .withExec(["sh", "-c", "cd apps/literature-rpg && bun run generate --check"])
        .withExec(["sh", "-c", "cd apps/literature-rpg && bun run validate"]);

      // --- Container 2: Go Environment (Tests) ---
      console.log("🐹 Configuring Go container...");
      const goContainer = client
        .container()
        .from("golang:1.22")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        .withExec(["sh", "-c", "cd apps/literature-rpg-tui && go test -v ./..."])
        .withExec(["sh", "-c", "cd packages/protocol/go && go test -v ./..."]);

      // --- Container 3: golangci-lint Environment (Linting) ---
      console.log("🧹 Configuring golangci-lint container...");
      const lintGoContainer = client
        .container()
        .from("golangci/golangci-lint:v1.64.8")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        .withExec(["sh", "-c", "cd apps/literature-rpg-tui && golangci-lint run --timeout 5m ./..."])
        .withExec(["sh", "-c", "cd packages/protocol/go && golangci-lint run --timeout 5m ./..."]);

      // --- Execute all checks in parallel ---
      console.log("🚀 Executing all checks in parallel...");
      await Promise.all([
        bunContainer.sync(),
        goContainer.sync(),
        lintGoContainer.sync(),
      ]);

      console.log("✅ All CI checks passed successfully! Safe to push.");
    },
    { LogOutput: process.stdout }
  );
}

runPipeline().catch((err) => {
  console.error("❌ CI Pipeline Failed:");
  console.error(err);
  process.exit(1);
});
