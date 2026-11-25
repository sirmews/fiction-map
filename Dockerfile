FROM oven/bun:1.3.14-debian AS bun

FROM rust:1.93.0-bookworm AS build
WORKDIR /app
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
RUN rustup target add wasm32-unknown-unknown
COPY . .
RUN bun install --frozen-lockfile
RUN CARGO_TARGET_DIR=/tmp/fiction-map-cargo bun run --cwd apps/literature-rpg build:deps

FROM bun AS server
WORKDIR /app
COPY --from=build /app /app
EXPOSE 8080
CMD ["bun", "run", "--cwd", "apps/literature-rpg", "src/main.ts", "--http", "--port", "8080"]
