/**
 * Neutral JSON Schema definition for the Frame and Intent presentation protocol.
 *
 * This schema is the single source of truth for the cross-language contract
 * between the headless engine and any frontends (TUI, Web, SaaS).
 *
 * @ai-rule Frame represents the complete visual and semantic state of the game at a single point in time.
 * @ai-rule Intent represents a user action sent from the UI to the engine to transition state.
 */
export const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "PresentationProtocol",
  description: "Headless presentation protocol for Fiction Map",
  definitions: {
    Frame: {
      type: "object",
      description: "The complete visual and semantic state of the game at a single point in time.",
      properties: {
        currentNode: {
          type: "object",
          description: "The active scene or node the player is currently on.",
          properties: {
            id: { type: "string", description: "Unique identifier of the node." },
            type: { type: "string", description: "The node type (e.g., 'scene', 'location')." },
            blocks: {
              type: "array",
              description: "Visual content blocks (paragraphs, headers, images) to render.",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  type: { type: "string", enum: ["paragraph", "header", "image"] },
                  text: { type: "string", description: "Text content for paragraphs and headers." },
                  url: { type: "string", description: "Image URL for image blocks." },
                  caption: { type: "string", description: "Optional caption for image blocks." },
                  metadata: { type: "object", additionalProperties: true },
                },
                required: ["id", "type"],
              },
            },
          },
          required: ["id", "type"],
        },
        choices: {
          type: "array",
          description: "Available choices/transitions the player can select from.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "The transition/edge ID." },
              label: { type: "string", description: "The text label to display to the user." },
            },
            required: ["id", "label"],
          },
        },
        resources: {
          type: "object",
          description: "Player resources (e.g., health, mana, gold, turns).",
          additionalProperties: { type: "number" },
        },
        inventory: {
          type: "array",
          description: "Items or entities currently owned by the player.",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "The entity ID." },
              label: { type: "string", description: "The human-readable name of the item." },
              // Note: symbol/color are omitted here as they are UI-layer concerns
            },
            required: ["id", "label"],
          },
        },
        flags: {
          type: "object",
          description: "Active story flags and their values.",
          additionalProperties: {
            anyOf: [{ type: "boolean" }, { type: "string" }, { type: "number" }],
          },
        },
        warnings: {
          type: "array",
          description: "Active warnings or alerts (e.g., 'THE CAVERN IS COLLAPSING!').",
          items: { type: "string" },
        },
        pacing: {
          type: "object",
          description: "Pacing metadata for progressive block reveals.",
          properties: {
            pacingIndex: { type: "number", description: "The index of the last revealed block." },
            isComplete: { type: "boolean", description: "Whether all blocks have been revealed." },
          },
          required: ["pacingIndex", "isComplete"],
        },
        serializedState: {
          type: "string",
          description: "Opaque, serialized representation of the GraphRuntimeState for save/load.",
        },
      },
      required: [
        "currentNode",
        "choices",
        "resources",
        "inventory",
        "flags",
        "warnings",
        "pacing",
        "serializedState",
      ],
    },
    Intent: {
      type: "object",
      description: "A user action sent from the UI to the engine to transition state.",
      properties: {
        type: {
          type: "string",
          description: "The kind of intent.",
          enum: ["selectChoice", "skipPacing", "save", "load", "quit"],
        },
        choiceId: {
          type: "string",
          description: "The transition ID to select (required for 'selectChoice').",
        },
        saveSlot: {
          type: "string",
          description:
            "The slot identifier to save to or load from (required for 'save' and 'load').",
        },
        serializedState: {
          type: "string",
          description:
            "Opaque, serialized representation of the GraphRuntimeState to load (required for 'load').",
        },
      },
      required: ["type"],
    },
  },
}
