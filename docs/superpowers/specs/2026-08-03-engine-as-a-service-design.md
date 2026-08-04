# Engine-as-a-Service (Portable Stateless Backend)

## 1. Overview
The goal is to transition the Fiction Map execution model from a "fat client" (where the browser runs the engine) to a "stateless backend" model. This enables monetization, prevents client-side cheating (save-scumming, state manipulation), and allows for cross-device progression, all without requiring a database yet.

We will achieve this by building a lightweight, highly portable Hono API (Engine Server) that uses JSON Web Tokens (JWT) to securely hold game state on the client while executing the authoritative logic on the server.

## 2. Architecture

### 2.1 The Stateless Engine Server (`apps/engine-server`)
A new application in the workspace using Bun and Hono.
*   **Stateless:** The server holds zero state in memory between requests.
*   **Authoritative:** All graph transitions (validation, conditions, effects) are executed by the server using `@fiction-map/runtime`.
*   **Portable:** By using Hono, this service can run on Bun, Cloudflare Workers, Node, or Vercel Edge functions.

### 2.2 JWT Signed State
Instead of writing the `SerializableState` to a database (like Redis), the server will:
1.  Serialize the game state (`serializeState`).
2.  Sign it using a cryptographic secret (JWT).
3.  Send the resulting token (`stateToken`) to the client.
4.  The client passes this token back on every action.
5.  The server verifies the signature, deserializes the state (`deserializeState`), applies the action, and returns a newly signed token.

### 2.3 The View Model (Sanitized State)
The client should *never* receive the raw `SerializableState` because it contains future edges, hidden node properties, and secret entity state.
The API will return a `ClientGameState` alongside the `stateToken`. This view model only contains what the player is currently allowed to see:
*   `currentNodeId`
*   `currentNodeDetails` (title, content text, etc.)
*   `availableChoices` (only edges where conditions passed)
*   `visibleStats` (health, gold, etc. extracted from the derived entity state)

## 3. Endpoints

### `GET /api/games`
*   **Purpose:** List available games on the platform.
*   **Response:** Array of `{ id: string, name: string, description: string }`.
*   *(MVP: Hardcoded to return `['literature-rpg']`)*

### `POST /api/games/:gameId/start`
*   **Purpose:** Start a new session for a specific game.
*   **Logic:**
    1. Look up the game configuration for `:gameId`.
    2. Initialize a fresh `GraphRuntime` with the game's blueprint.
    3. `const serialized = serializeState(runtime.state)`.
    4. Sign `serialized` into a JWT string.
    5. Generate the `ClientGameState` view model.
*   **Response:** `{ stateToken: string, view: ClientGameState }`

### `POST /api/games/:gameId/step`
*   **Purpose:** Submit a player choice.
*   **Request Body:** `{ stateToken: string, choiceId: string }`
*   **Logic:**
    1. Verify JWT signature. If invalid, throw 401 Unauthorized.
    2. Decode JWT payload into `SerializableState`.
    3. Call `deserializeState(payload)`.
    4. Re-hydrate `GraphRuntime` with the specific `:gameId` blueprint and the deserialized state.
    5. Ensure `choiceId` is available.
    6. Execute `runtime.step(choiceId)`.
    7. Re-serialize and sign the new state.
    8. Generate the new `ClientGameState`.
*   **Response:** `{ stateToken: string, view: ClientGameState }`

## 4. Frontend Integration (`apps/literature-rpg-web`)

The React frontend needs to be refactored to act as a "dumb terminal":
1.  **Remove local runtime:** The app will no longer import `@fiction-map/runtime` to execute logic.
2.  **API Client hook:** A new `usePlatformEngine` hook will replace `useStoryRuntime`.
3.  **State Management:** The hook will store the `stateToken` in `localStorage` to allow resume-on-refresh.
4.  **Rendering:** The UI will map directly from the `ClientGameState` view model returned by the server.

## 5. Security & Limitations
*   **Cheating:** Players cannot manipulate their gold or health. The JWT signature guarantees integrity.
*   **Save Scumming:** Because this is stateless, a player *could* copy their JWT string before making a bad choice, and replay it later to undo their mistake. Since this is a fictional story platform (not real money gaming), this is an acceptable tradeoff for extreme portability and zero database costs. (If this ever becomes a problem, we switch to a Redis backend without changing the API contract).
*   **Game Loading:** For the MVP, the `engine-server` will import the `literature-rpg` definitions directly at build time to construct the registry. In the future, this will be dynamically loaded from a database or storage bucket.
