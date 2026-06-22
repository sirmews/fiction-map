import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { connect } from "@dagger.io/dagger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getProvisioningFailureMessage(error: unknown): string {
  const seen: unknown[] = [];
  const messages: string[] = [];
  let current = error;
  while (current && typeof current === "object") {
    if (seen.includes(current)) {
      break;
    }
    seen.push(current);
    if ("message" in current && typeof current.message === "string") {
      messages.push(current.message);
    }
    current = (current as { cause?: unknown }).cause;
  }
  return messages.join(" ");
}

async function runPipelineAttempt() {
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

      // 2. Define persistent cache volumes for ultra-fast subsequent runs
      const bunCache = client.cacheVolume("fiction-map-bun-cache");
      const nodeModulesCache = client.cacheVolume("fiction-map-node-modules-cache");
      const goModCache = client.cacheVolume("fiction-map-go-mod-cache");
      const goBuildCache = client.cacheVolume("fiction-map-go-build-cache");
      const golangciLintCache = client.cacheVolume("fiction-map-golangci-lint-cache");

      // --- Container 1: Bun Environment (Lint, Typecheck, Test, Protocol, Metadata) ---
      console.log("📦 Configuring Bun container...");
      let bunContainer = client
        .container()
        .from("oven/bun:1.3.14")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        // Mount Bun and node_modules caches
        .withMountedCache("/root/.bun", bunCache)
        .withMountedCache("/app/node_modules", nodeModulesCache)
        // Install git for diff debugging
        .withExec(["apt-get", "update"])
        .withExec(["apt-get", "install", "-y", "git"])
        .withExec(["bun", "install"])
        .withExec(["bun", "run", "build"])
        .withExec(["bun", "run", "check"])
        .withExec(["bun", "run", "lint:boundaries"])
        .withExec(["bun", "run", "typecheck"])
        .withExec(["bun", "test"])
        .withExec(["sh", "-c", "cd packages/protocol && bun run generate --check"])
        .withExec(["sh", "-c", "cd apps/literature-rpg && (bun run generate --check || (cp .fiction-map/metadata.json /tmp/old-metadata.json && cp SEMANTICS.md /tmp/old-semantics.md && bun run generate && diff -u /tmp/old-metadata.json .fiction-map/metadata.json && diff -u /tmp/old-semantics.md SEMANTICS.md && exit 1))"])
        .withExec(["sh", "-c", "cd apps/literature-rpg && bun run validate"]);

      // --- Container 2: Go Environment (Tests) ---
      console.log("🐹 Configuring Go container...");
      const goContainer = client
        .container()
        .from("golang:1.22")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        // Mount Go module and build caches
        .withMountedCache("/go/pkg/mod", goModCache)
        .withMountedCache("/root/.cache/go-build", goBuildCache)
        .withExec(["sh", "-c", "cd apps/literature-rpg-tui && go test -v ./..."])
        .withExec(["sh", "-c", "cd packages/protocol/go && go test -v ./..."]);

      // --- Container 3: golangci-lint Environment (Linting) ---
      console.log("🧹 Configuring golangci-lint container...");
      const lintGoContainer = client
        .container()
        .from("golangci/golangci-lint:v1.64.8")
        .withDirectory("/app", sourceDir)
        .withWorkdir("/app")
        // Mount Go module, build, and golangci-lint caches
        .withMountedCache("/go/pkg/mod", goModCache)
        .withMountedCache("/root/.cache/go-build", goBuildCache)
        .withMountedCache("/root/.cache/golangci-lint", golangciLintCache)
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
    { LogOutput: process.stderr },
  );
}

async function runPipeline() {
  console.log("🚀 Starting Fiction Map Local CI Pipeline via Dagger...");

  const maxAttempts = 3;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await runPipelineAttempt();
      return;
    } catch (error) {
      lastError = error;
      const message = getProvisioningFailureMessage(error);
      const shouldRetry =
        message.includes("automatic provisioning") ||
        message.includes("connectParams.port") ||
        message.includes("failed to execute function with automatic provisioning");

      if (!shouldRetry || attempt === maxAttempts) {
        throw error;
      }
      console.error(`⚠️ Dagger engine setup failed on attempt ${attempt}/${maxAttempts}; retrying...`);
      await new Promise((resolve) => {
        setTimeout(resolve, 3000 * attempt);
      });
    }
  }
  throw lastError;
}

runPipeline().catch((err) => {
  console.error("❌ CI Pipeline Failed:");
  console.error(err);
  process.exit(1);
});
