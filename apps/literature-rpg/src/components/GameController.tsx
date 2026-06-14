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
          <Box marginBottom={1}>
            <Text bold color="cyan" underline>PLAYER STATUS</Text>
          </Box>
          
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
            <Box marginTop={1}>
              <Text color="yellow">⏳ CD: {cooldown} turns left</Text>
            </Box>
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
          <Box marginY={1}>
            <Text bold color="green">✨ Traversal complete! Press [Enter] or [Q] to exit. ✨</Text>
          </Box>
        )}

        <Text dimColor>
          [↑/↓] Navigate  •  [1-9] Quick Hotkey  •  [Enter] Confirm  •  [Q] Quit
        </Text>
      </Box>
    </Box>
  );
}
