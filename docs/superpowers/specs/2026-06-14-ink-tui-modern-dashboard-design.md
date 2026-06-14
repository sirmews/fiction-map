# Design Spec: Ink TUI Modern Dashboard

## 1. Overview
The goal is to replace the sequential prompt-based TUI in `apps/literature-rpg` (currently using `@clack/prompts`) with a modern, responsive, split-screen terminal dashboard built using **Ink** (React for terminal interfaces). 

This delivers a rich gameplay screen layout where narrative text flows on the left while player attributes, wallet, cooldowns, and inventory remain persistently aligned on the right.

## 2. Requirements & UI Layout
- **Full Screen Buffer**: The layout will fill the terminal screen, re-rendering responsively as terminal sizes adjust.
- **Top Header**: Renders the story title and current room ID.
- **Left Column (Story Content)**:
  - Iterates over active `blocks` on the current node.
  - Dynamically renders `paragraph` and `header` blocks with appropriate margins and formatting.
  - Honors pacing delays (`delayAfterMs`) using react effect timeouts to reveal narrative progressively.
- **Right Column (Player Stats HUD)**:
  - Draws visual progress bars for Health and Mana pools (e.g., `❤️ HP: [██████░░░░] 60%`).
  - Lists currency balances, active turn counters, and alerts (e.g. collapsing cavern warning).
  - Lists acquired inventory entities and spells.
  - Tracks active cooldown timers.
- **Bottom Footer (Action Menu & Keytips)**:
  - Interactive choice list highlighting the selected option with cursor glyphs.
  - Allows both **Arrow Key Highlight Navigation** and **Direct Numeric Key Input (1-9)**.
  - Clear keyboard tips for quick reference.

## 3. Technology Stack & Configuration
- **Libraries**:
  - `ink` (v4.x.x) - CLI rendering engine.
  - `react` (v18.x.x) - State management and component architecture.
  - `chalk` or `picocolors` - Text styling and high-contrast color highlights.
- **TypeScript Integration**:
  - Update `apps/literature-rpg/tsconfig.json` to configure `"jsx": "react-jsx"` to enable JSX/TSX compilation for Ink components.
- **Runtime State Loop**:
  - Integrates the existing `GraphRuntime` and middleware trigger execution pipeline directly into React component lifecycle state (`useState`, `useEffect`).

## 4. Traversals & Logic
- Input keys are captured cleanly via Ink's `useInput` hook.
- Arrow up/down cycles through active choice nodes.
- Numeric keys match index triggers (1-indexed matching choices).
- Transitions are evaluated against `runtime.step(state, choice)`. If a transition fails, the app renders a high-contrast terminal modal. If successful, state updates, triggering a reactive repaint.
- Game Over nodes (e.g., `death` or `victory`) are handled cleanly by unmounting the game loop and printing standard stylized end-screens.
