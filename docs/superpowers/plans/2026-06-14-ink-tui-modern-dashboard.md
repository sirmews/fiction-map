# Ink TUI Modern Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the sequential CLI prompts in `apps/literature-rpg` with a highly interactive, responsive, split-screen React terminal dashboard using Ink.

**Architecture:** We will configure JSX/TSX support, add React/Ink dependencies, implement a unified, state-driven React `<GameController>` component with interactive keyboard listeners (`useInput` for arrows/numbers), and launch it in `main.tsx`.

**Tech Stack:** React 18, Ink 4, Bun, TypeScript, Picocolors.

---

### File Structure Changes
- `apps/literature-rpg/package.json` (Modify: add dependencies)
- `apps/literature-rpg/tsconfig.json` (Modify: configure JSX support)
- `apps/literature-rpg/src/main.tsx` (Rename from `main.ts` and modify to mount React GameController)
- `apps/literature-rpg/src/main.test.ts` (Modify: update imports)

---

### Task 1: Environment & Dependency Setup

**Files:**
- Modify: `apps/literature-rpg/package.json`
- Modify: `apps/literature-rpg/tsconfig.json`

- [ ] **Step 1: Update package.json with React and Ink dependencies**

Add `ink`, `react`, and `@types/react` to dependencies/devDependencies.

In `apps/literature-rpg/package.json`:
Replace dependencies with:
```json
  "dependencies": {
    "@fiction-map/core": "workspace:*",
    "@fiction-map/entities": "workspace:*",
    "@fiction-map/runtime": "workspace:*",
    "fiction-map": "workspace:*",
    "ink": "^4.4.1",
    "picocolors": "^1.1.1",
    "react": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.4.0",
    "vitest": "^1.0.0"
  }
```
And change the `"start"` script to:
`"start": "bun run src/main.tsx"`

- [ ] **Step 2: Enable React-JSX in tsconfig.json**

In `apps/literature-rpg/tsconfig.json`, add `"jsx": "react-jsx"`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "types": ["vitest/globals"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Install the new dependencies**

Run: `bun install` inside the workspace root.
Expected: Exit code 0, node_modules populated.

- [ ] **Step 4: Commit dependencies**

Run: `git add apps/literature-rpg/package.json apps/literature-rpg/tsconfig.json bun.lock`
Run: `git commit -m "chore(rpg): add react and ink dependencies with jsx configuration"`

---

### Task 2: Implement the Ink GameController Component

**Files:**
- Create: `apps/literature-rpg/src/components/GameController.tsx`

- [ ] **Step 1: Write GameController component code**

Create `apps/literature-rpg/src/components/GameController.tsx` with full React implementation, including state triggers, resource progress bars, layout boxes, and `useInput` keyboard listener supporting arrows and numeric shortcuts.

```tsx
import React, { useState, useEffect } from "react";
import { Box, Text, useInput, useApp } from "ink";
import pc from "picocolors";
import {
  createInitialState,
  deriveEntityState,
} from "@fiction-map/runtime";
import { story } from "../graphs/story.graph";
import { world } from "../world";
import { runtime } from "../main";

function renderProgressBar(current: number, max: number, fillChar = "█", emptyChar = "░", length = 10): string {
  const clampedCurrent = Math.max(0, Math.min(max, current));
  const filledLength = Math.round((clampedCurrent / max) * length);
  const emptyLength = length - filledLength;
  return `[${fillChar.repeat(filledLength)}${emptyChar.repeat(emptyLength)}]`;
}

export function GameController() {
  const { exit } = useApp();
  const [state, setState] = useState(() => createInitialState(runtime.startNodeId));
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [pacingIndex, setPacingIndex] = useState(0);

  // Re-compute runtime context
  const context = { derivedState: deriveEntityState(world, state) };
  const currentNode = story.nodes.find((n) => n.id === state.currentNodeId);

  // Available choices at the current node
  const availableChoices = runtime.getAvailable(state, context);

  // Auto-pace content blocks
  useEffect(() => {
    setPacingIndex(0);
    setSelectedIndex(0);
  }, [state.currentNodeId]);

  useEffect(() => {
    if (!currentNode || !currentNode.blocks) return;
    if (pacingIndex < currentNode.blocks.length - 1) {
      const currentBlock = currentNode.blocks[pacingIndex];
      const delay = (currentBlock.metadata as any)?.delayAfterMs;
      if (typeof delay === "number" && delay > 0) {
        const timer = setTimeout(() => {
          setPacingIndex((prev) => prev + 1);
        }, delay);
        return () => clearTimeout(timer);
      } else {
        setPacingIndex((prev) => prev + 1);
      }
    }
  }, [pacingIndex, currentNode, state.currentNodeId]);

  // Handle keyboard inputs
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : availableChoices.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < availableChoices.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      if (availableChoices.length > 0) {
        handleChoiceSelection(availableChoices[selectedIndex]);
      } else {
        exit();
      }
    } else if (input >= "1" && input <= "9") {
      const idx = parseInt(input, 10) - 1;
      if (idx >= 0 && idx < availableChoices.length) {
        handleChoiceSelection(availableChoices[idx]);
      }
    } else if (input === "q" || input === "Q") {
      exit();
    }
  });

  function handleChoiceSelection(choice: any) {
    const result = runtime.step(state, choice, context);
    if (result.success) {
      setState(result.state);
    }
  }

  if (!currentNode) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red">❌ Error: Current Node '{state.currentNodeId}' not found.</Text>
      </Box>
    );
  }

  const hp = state.entityState?.resources?.health ?? 0;
  const mp = state.entityState?.resources?.mana ?? 0;
  const gold = state.entityState?.resources?.gold ?? 0;
  const turns = state.entityState?.resources?.turns ?? 0;
  const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
  const inventory = Array.from(context.derivedState.ownedEntityIds);

  const activeBlocks = currentNode.blocks ? currentNode.blocks.slice(0, pacingIndex + 1) : [];

  return (
    <Box flexDirection="column" width="100%" height="100%" borderStyle="round" borderColor="magenta">
      {/* 1. Top Header */}
      <Box paddingX={1} marginBottom={1} justifyContent="space-between">
        <Text bold color="black" backgroundColor="magenta"> FICTION MAP : LITERATURE RPG </Text>
        <Text dimColor>Node: {currentNode.id} ({currentNode.type})</Text>
      </Box>

      {/* 2. Middle Panels (Split Left Story / Right HUD) */}
      <Box flexGrow={1} width="100%">
        {/* Left Side: Story Text */}
        <Box width="65%" flexDirection="column" paddingRight={2} paddingLeft={1}>
          {activeBlocks.length > 0 ? (
            activeBlocks.map((block) => (
              <Box key={block.id} flexDirection="column" marginBottom={1}>
                {block.type === "header" ? (
                  <Text bold underline color="white">{block.text}</Text>
                ) : (
                  <Text color="white">{block.text}</Text>
                )}
              </Box>
            ))
          ) : (
            <Text color="white">{String((currentNode as any).body || "")}</Text>
          )}
        </Box>

        {/* Right Side: Persistent Player HUD */}
        <Box width="35%" flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
          <Text bold color="cyan" underline marginBottom={1}>PLAYER STATUS</Text>
          
          <Box flexDirection="column" marginBottom={1}>
            <Text color="red">❤️ HP {renderProgressBar(hp, 100)} {hp}%</Text>
            <Text color="blue">🧪 MP {renderProgressBar(mp, 50)} {mp}/50</Text>
          </Box>

          <Text color="yellow">🪙 Gold: {gold}g</Text>
          <Text color="white">🕒 Turn: {turns}</Text>
          
          {turns > 10 && (
            <Box marginTop={1}>
              <Text bold color="red">⚠️ THE CAVERN IS COLLAPSING!</Text>
              <Text color="red">(-25 HP per turn!)</Text>
            </Box>
          )}

          {cooldown > 0 && (
            <Text color="yellow" marginTop={1}>⏳ CD: {cooldown} turns left</Text>
          )}

          <Box flexDirection="column" marginTop={1}>
            <Text bold color="cyan" underline>INVENTORY</Text>
            {inventory.length > 0 ? (
              inventory.map((id) => (
                <Text key={id} color="green">• {id}</Text>
              ))
            ) : (
              <Text dimColor>Empty backpack</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* 3. Bottom Action Footer */}
      <Box flexDirection="column" borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor="magenta" padding={1} marginTop={1}>
        {availableChoices.length > 0 ? (
          <>
            <Text bold color="yellow">What do you do?</Text>
            <Box flexDirection="column" marginTop={1} marginBottom={1}>
              {availableChoices.map((choice, i) => {
                const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
                const isSelected = i === selectedIndex;
                return (
                  <Text key={choice.id} color={isSelected ? "cyan" : "white"}>
                    {isSelected ? "❯ " : "  "}[{i + 1}] {String(label)}
                  </Text>
                );
              })}
            </Box>
          </>
        ) : (
          <Text bold color="green" marginY={1}>✨ Traversal complete! Press [Enter] or [Q] to exit. ✨</Text>
        )}

        <Text dimColor>
          [↑/↓] Navigate  •  [1-9] Quick Hotkey  •  [Enter] Confirm  •  [Q] Quit
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Commit GameController file**

Run: `git add apps/literature-rpg/src/components/GameController.tsx`
Run: `git commit -m "feat(rpg): create React-based Ink GameController dashboard component"`

---

### Task 3: Mount the GameController and Launch in main.tsx

**Files:**
- Create: `apps/literature-rpg/src/main.tsx`
- Remove: `apps/literature-rpg/src/main.ts`
- Modify: `apps/literature-rpg/src/main.test.ts`

- [ ] **Step 1: Write main.tsx**

Write the main entry point to use Ink's `render` to mount `<GameController />`.

```tsx
/**
 * Runtime entry point for the literature-rpg consumer app.
 *
 * Builds a `GraphRuntime` from the authored graph in `graphs/story.graph.ts`
 * and renders a React-based interactive TUI dashboard using Ink.
 */

import React from "react";
import { render } from "ink";
import {
  createRuntimeFromGraph,
  registerBuiltins,
} from "@fiction-map/runtime";
import { story } from "./graphs/story.graph";
import { registry } from "./project";
import { world } from "./world";
import { GameController } from "./components/GameController";

registerBuiltins(registry);

export const runtime = createRuntimeFromGraph(story);

// Global Triggers
runtime.addTrigger({
  id: "turn-counter-trigger",
  conditions: [],
  effects: [{ type: "addResource", key: "turns", amount: 1 }],
});

runtime.addTrigger({
  id: "cavern-collapse-trigger",
  conditions: [
    { type: "resourceAtLeast", key: "turns", value: 11 },
  ],
  effects: [{ type: "spendResource", key: "health", amount: 25, clampToZero: true }],
});

runtime.addTrigger({
  id: "death-trigger",
  conditions: [{ type: "resourceLessThan", key: "health", value: 1 }],
  effects: [{ type: "navigate", nodeId: "death" }],
});

runtime.addTrigger({
  id: "mana-regen-trigger",
  conditions: [{ type: "resourceLessThan", key: "mana", value: 50 }],
  effects: [{ type: "addResource", key: "mana", amount: 5 }],
});

runtime.addTrigger({
  id: "cooldown-tick-trigger",
  conditions: [{ type: "resourceAtLeast", key: "heal_cooldown", value: 1 }],
  effects: [{ type: "spendResource", key: "heal_cooldown", amount: 1, clampToZero: true }],
});

export async function playInteractive() {
  const { waitUntilExit } = render(<GameController />);
  await waitUntilExit();
}

// Only run when invoked directly
if ((import.meta as { main?: boolean }).main) {
  if (world.errors.length > 0) {
    console.error("World definition has errors. Exiting.", world.errors);
    process.exit(1);
  }
  
  await playInteractive();
}
```

- [ ] **Step 2: Update the main.test.ts imports**

In `apps/literature-rpg/src/main.test.ts`, change the import statement on line 2 from:
```typescript
import { runtime } from "./main";
```
to:
```typescript
import { runtime } from "./main.tsx";
```

- [ ] **Step 3: Remove the old main.ts and run verify**

Delete `apps/literature-rpg/src/main.ts` to prevent duplicate main entries.

Verify the test passes: `bun test`
Expected: 129 pass, 0 fail.

- [ ] **Step 4: Commit changes**

Run: `git rm apps/literature-rpg/src/main.ts`
Run: `git add apps/literature-rpg/src/main.tsx apps/literature-rpg/src/main.test.ts`
Run: `git commit -m "feat(rpg): mount React GameController and run CLI through Ink renderer"`
