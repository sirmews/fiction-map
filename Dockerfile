# Use the official Bun image
FROM oven/bun:1-alpine AS base
WORKDIR /app

# Copy package.json and lockfile
COPY package.json bun.lock ./
COPY packages/core/package.json packages/core/
COPY packages/entities/package.json packages/entities/
COPY packages/runtime/package.json packages/runtime/
COPY packages/protocol/package.json packages/protocol/
COPY packages/cli/package.json packages/cli/
COPY apps/literature-rpg/package.json apps/literature-rpg/
COPY apps/literature-rpg-web/package.json apps/literature-rpg-web/

# Install dependencies
RUN bun install --frozen-lockfile

# Copy the rest of the source code
COPY . .

# Build dependencies
RUN bun run build

# Expose the port
EXPOSE 8080

# Command to run the HTTP server
CMD ["bun", "run", "--cwd", "apps/literature-rpg", "src/main.ts", "--http", "--port", "8080"]
