# Self-Hosting and Deployment Guide

This guide explains how to deploy, self-host, and connect to the **Fiction Map** story engine server.

---

## Architecture Overview

Fiction Map is built as a headless, decoupled engine:
1. **Engine Server (Node/Bun)**: Runs the story logic, manages session state, and exposes a stateless or in-memory session-based HTTP API.
2. **Client (Go/Bubble Tea)**: A terminal user interface that renders the game and communicates with the engine over either local `stdio` (sidecar mode) or `HTTP` (remote host mode).

---

## 1. Local Development & Running the Server

You can run the engine server locally using **Bun**.

### Start the HTTP Server
To start the server on the default port (`8080`):
```bash
bun run --cwd apps/literature-rpg src/main.ts --http
```

### Custom Port
To specify a custom port, use the `--port` flag or the `PORT` environment variable:
```bash
bun run --cwd apps/literature-rpg src/main.ts --http --port 9000
```
or
```bash
PORT=9000 bun run --cwd apps/literature-rpg src/main.ts --http
```

---

## 2. Docker Deployment (Single-Container Self-Host)

We provide a production-ready `Dockerfile` at the root of the repository to package the engine server into a lightweight, highly performant container.

### Build the Docker Image
From the root of the repository, run:
```bash
docker build -t fiction-map-engine .
```

### Run the Docker Container
Run the container and map port `8080` of the container to port `8080` of your host:
```bash
docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  --name fiction-map-engine \
  fiction-map-engine
```

---

## 3. HTTP API Reference

The engine server exposes two main endpoints.

### `GET /health`
A simple health check endpoint to verify that the server is running.

**Response (`200 OK`)**:
```json
{
  "status": "ok"
}
```

---

### `POST /intent`
The primary endpoint for session-based gameplay and state transitions.

#### Request Body
* `sessionId` *(string, optional)*: A unique identifier for the player's session. If omitted or not found in the server's in-memory store, a new session state is initialized and a new UUID is generated and returned.
* `intent` *(object, optional)*: The user action to apply to the state. If omitted, the server simply returns the current visual `Frame` for the session.

**Example Request (Start a new session)**:
```json
{}
```

**Example Request (Select a choice in an existing session)**:
```json
{
  "sessionId": "a3b8c2d1-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
  "intent": {
    "type": "selectChoice",
    "choiceId": "enter-entrance"
  }
}
```

**Example Request (Load a saved game state)**:
```json
{
  "sessionId": "a3b8c2d1-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
  "intent": {
    "type": "load",
    "serializedState": "{\"currentNodeId\":\"entrance\",\"history\":[\"courtyard\"],\"variables\":{},\"flags\":{},\"visited\":[\"courtyard\"],\"entityState\":{\"owned\":[],\"active\":[],\"unlocked\":[],\"resources\":{\"health\":100,\"mana\":50,\"gold\":30,\"turns\":1}}}"
  }
}
```

#### Response Body
* `sessionId` *(string)*: The active session ID.
* `frame` *(object)*: The complete visual and semantic state of the game at this point in time (as defined by the presentation protocol schema).

**Example Response**:
```json
{
  "sessionId": "a3b8c2d1-e4f5-6a7b-8c9d-0e1f2a3b4c5d",
  "frame": {
    "currentNode": {
      "id": "entrance",
      "type": "scene",
      "blocks": [
        {
          "id": "welcome",
          "type": "paragraph",
          "text": "You stand before the grand entrance of the ancient castle."
        }
      ]
    },
    "choices": [
      {
        "id": "enter-hall",
        "label": "Open the heavy oak doors and enter the Main Hall"
      }
    ],
    "resources": {
      "health": 100,
      "mana": 50,
      "gold": 30,
      "turns": 1
    },
    "inventory": [],
    "flags": {},
    "warnings": [],
    "pacing": {
      "pacingIndex": 0,
      "isComplete": true
    },
    "serializedState": "..."
  }
}
```

---

## 4. Connecting the Bubble Tea Client

The Go-based terminal client (`apps/literature-rpg-tui`) supports connecting to a remote self-hosted HTTP engine server instead of spawning a local stdio sidecar.

### Run the Client with `--host`
To start the client and connect to a running HTTP engine server, pass the `--host` flag:
```bash
./apps/literature-rpg-tui/literature-rpg-tui --host http://localhost:8080
```

This swaps the transport layer seamlessly under the hood, allowing you to play the game on a remote server with zero lag or visual differences.
