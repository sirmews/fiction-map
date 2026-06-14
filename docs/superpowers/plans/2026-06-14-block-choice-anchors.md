# Block-Choice Anchors & Rich Content Blocks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement structured Rich Content Blocks, generic metadata extensions, and a Declarative Block-Choice Association Engine with static compiler validations and backward-compatibility.

**Architecture:**
- Extend `NodeInstance` and `NodeDefinition` with an optional `blocks` array containing `ContentBlock` objects. Each block can hold a generic `metadata?: Record<string, unknown>`.
- Extend `EdgeInstance` and `Transition` with an optional `anchorBlockId` string property.
- Integrate a new `UNKNOWN_ANCHOR_BLOCK_ID` validation check in our core static compiler validator.
- Upgrade the terminal TUI and React Web UI to render these blocks dynamically and pace block rendering using `metadata.delayAfterMs`.

**Tech Stack:** TypeScript, Bun, Bun Test, React, Tailwind CSS

---

### Task 1: Implement Core and Runtime Schemas with Compiler Validation

**Files:**
- Modify: `packages/core/src/types.ts` (define `ContentBlock` type and extend node/edge interfaces).
- Modify: `packages/core/src/graph.ts` (implement the `UNKNOWN_ANCHOR_BLOCK_ID` validation rule).
- Modify: `packages/runtime/src/types.ts` (define `ContentBlock` and extend runtime node/edge interfaces).
- Modify: `packages/runtime/src/adapter.ts` (add `[key: string]: unknown` to `NodeBlueprint` and map `properties` generically).
- Modify: `packages/runtime/src/graph-definition.ts` (extend node mapping to preserve properties and compile blocks generically).
- Create/Modify: `packages/core/src/index.test.ts` (assert compilation and check for `UNKNOWN_ANCHOR_BLOCK_ID` validation errors on broken anchors).

- [ ] **Step 1: Update packages/core/src/types.ts**

Read `packages/core/src/types.ts` and add `ContentBlock` and `blocks` / `anchorBlockId` properties:

```typescript
// Add at the bottom of packages/core/src/types.ts:
export interface ContentBlock {
  id: string
  type: "paragraph" | "header" | "image" | "video"
  text?: string
  url?: string
  level?: number
  caption?: string
  metadata?: Record<string, unknown>
}

// In NodeInstance and NodeConfig:
  blocks?: ContentBlock[]

// In EdgeInstance and EdgeConfig:
  anchorBlockId?: string
```

Let's read `packages/core/src/types.ts` using `grep` or `read` around those interfaces to make sure we replace the correct sections.

- [ ] **Step 2: Update packages/core/src/graph.ts with UNKNOWN_ANCHOR_BLOCK_ID validation**

Read `packages/core/src/graph.ts` and implement the validation:

```typescript
    // Validate edge anchor block exists in source node
    if (edge.anchorBlockId) {
      const sourceNode = nodeIndex.get(edge.source)
      if (sourceNode) {
        const hasBlock = sourceNode.blocks?.some((block: any) => block.id === edge.anchorBlockId)
        if (!hasBlock) {
          errors.push({
            code: "UNKNOWN_ANCHOR_BLOCK_ID",
            message: `Edge "${edge.id}" specifies anchorBlockId "${edge.anchorBlockId}" but source node "${edge.source}" does not contain a content block with that ID.`,
            edgeId: edge.id,
            nodeId: edge.source,
          })
        }
      }
    }
```

- [ ] **Step 3: Update packages/runtime/src/types.ts**

Read `packages/runtime/src/types.ts` and declare `ContentBlock` and properties:

```typescript
// Add ContentBlock interface:
export interface ContentBlock {
  id: string
  type: "paragraph" | "header" | "image" | "video"
  text?: string
  url?: string
  level?: number
  caption?: string
  metadata?: Record<string, unknown>
}

// Inside NodeDefinition:
  blocks?: ContentBlock[]

// Inside Transition:
  anchorBlockId?: string
```

- [ ] **Step 4: Update packages/runtime/src/adapter.ts & graph-definition.ts for Backward-compatibility**

Read `packages/runtime/src/adapter.ts` and update it to map blocks and anchor properties cleanly:

```typescript
// In packages/runtime/src/adapter.ts NodeBlueprint:
export interface NodeBlueprint {
  id: string
  type?: string
  blocks?: ContentBlock[]
  [key: string]: unknown
}

// In parseGraph:
  const nodes = new Map<string, NodeDefinition>(
    blueprint.nodes.map((n) => {
      const { id, type, blocks, ...properties } = n
      return [id, { id, type, blocks, properties }]
    })
  )

// In graphEdgeToBlueprint:
  if (edge.anchorBlockId) {
    blueprint.anchorBlockId = edge.anchorBlockId
  }
```

Read `packages/runtime/src/graph-definition.ts` and implement backward-compatible block synthesis:

```typescript
// In graphDefinitionToBlueprint:
export function graphDefinitionToBlueprint(graph: GraphDefinition): GraphBlueprint {
  return {
    nodes: graph.nodes.map((node) => {
      const { id, type, ...properties } = node as any
      // Backward-compatibility: if blocks is missing but body is present, synthesize a flat paragraph block
      const blocks = node.blocks || (node.body ? [{ id: `${node.id}-body`, type: "paragraph", text: node.body }] : undefined)
      return { id, type, blocks, ...properties }
    }),
    edges: graph.edges.map(graphEdgeToBlueprint),
    endings: graph.endings,
  }
}
```

- [ ] **Step 5: Write unit tests in core/src/index.test.ts**

Modify `packages/core/src/index.test.ts` to assert that the `UNKNOWN_ANCHOR_BLOCK_ID` warning/error is raised correctly:

```typescript
    it("should fail validation if anchorBlockId does not exist on source node", () => {
      defineNodeType(registry, { id: "scene", outgoingEdges: ["choice"], incomingEdges: ["choice"] })
      defineEdgeType(registry, { id: "choice", sourceTypes: ["scene"], targetTypes: ["scene"] })

      const graph = defineGraph(registry, {
        id: "test-story",
        nodes: [
          { 
            id: "start", 
            type: "scene", 
            blocks: [{ id: "intro", type: "paragraph", text: "Hello" }] 
          },
          { id: "end", type: "scene" },
        ],
        edges: [
          { 
            id: "c1", 
            type: "choice", 
            source: "start", 
            target: "end", 
            anchorBlockId: "non-existent-block-id" 
          },
        ],
      })

      expect(graph.errors).toContainEqual(
        expect.objectContaining({ code: "UNKNOWN_ANCHOR_BLOCK_ID" })
      )
    })
```

- [ ] **Step 6: Build, test and commit**

Run: `bun run build && bun test`
Expected: 129/129 tests pass successfully.

```bash
git add packages/core/src packages/runtime/src
git commit -m "feat(core/runtime): implement block schemas, anchors, and anchor validation with backward-compatibility"
```

---

### Task 2: Update World and Graph to Use Structured Content Blocks

**Files:**
- Modify: `apps/literature-rpg/src/graphs/story.graph.ts` (re-write nodes using structured `blocks` and update edge definitions to include `anchorBlockId` references).

- [ ] **Step 1: Upgrade story.graph.ts content blocks**

Replace the nodes definition inside `apps/literature-rpg/src/graphs/story.graph.ts` with structured blocks and anchors:

```typescript
import { defineGraph } from "@fiction-map/core";
import { registry } from "../project";

export const story = defineGraph(registry, {
  id: "library-mystery",
  nodes: [
    { 
      id: "entrance", 
      type: "scene", 
      blocks: [
        { id: "entrance-desc", type: "paragraph", text: "You stand at the entrance to the old library." }
      ] 
    },
    { 
      id: "main-hall", 
      type: "scene", 
      blocks: [
        { id: "hall-desc", type: "paragraph", text: "Dust motes float in shafts of grey light. A lantern sits on a table." },
        { id: "hall-passage", type: "paragraph", text: "In the center of the hall, a yawning dark chasm drops into the earth." },
        { id: "hall-archives", type: "paragraph", text: "To your left, the heavy iron-reinforced doors of the archives loom." }
      ] 
    },
    { 
      id: "archives", 
      type: "scene", 
      blocks: [
        { id: "archives-desc", type: "paragraph", text: "Towering shelves hold forgotten lore. Magical tomes rest on reading pedestals, and a spectral librarian floats nearby.", metadata: { delayAfterMs: 400 } },
        { id: "archives-heal-tome", type: "paragraph", text: "On a brass stand rests the glowing 'Tome of Heal Spell'." },
        { id: "archives-light-tome", type: "paragraph", text: "On a nearby desk rests the 'Tome of Mage Light Spell'." },
        { id: "archives-librarian", type: "paragraph", text: "The spectral librarian gazes at you, offering lockpicks for trade." }
      ] 
    },
    { 
      id: "dark-chapter", 
      type: "scene", 
      blocks: [
        { id: "chapter-desc", type: "paragraph", text: "A narrow passage drops into darkness. You hear the crackle of ancient magic." }
      ] 
    },
    { 
      id: "chamber-of-runes", 
      type: "scene", 
      blocks: [
        { id: "runes-desc", type: "paragraph", text: "Glowing glyphs pulsate on the walls. A central stone pedestal holds a shining key." }
      ] 
    },
    { 
      id: "collapsed-bridge", 
      type: "scene", 
      blocks: [
        { id: "bridge-desc", type: "paragraph", text: "A stone bridge has collapsed over a bottomless chasm. Dust and rubble are everywhere." }
      ] 
    },
    { 
      id: "forgotten-crypt", 
      type: "scene", 
      blocks: [
        { id: "crypt-desc", type: "paragraph", text: "An ancient crypt, smelling of age. A massive iron casket lies in the center." }
      ] 
    },
    { 
      id: "victory", 
      type: "scene", 
      blocks: [
        { id: "victory-desc", type: "paragraph", text: "You successfully unlocked the iron casket, revealing the legendary treasure of the Library!" }
      ] 
    },
    { 
      id: "death", 
      type: "scene", 
      blocks: [
        { id: "death-desc", type: "paragraph", text: "The dark forces of the passage overwhelm you. Your journey ends here." }
      ] 
    },
  ],
  edges: [
    {
      id: "enter-hall",
      type: "choice",
      source: "entrance",
      target: "main-hall",
      text: "Step inside",
      effects: [
        { type: "grantEntity", entityId: "lantern" },
        { type: "addResource", key: "health", amount: 100 },
        { type: "addResource", key: "mana", amount: 50 },
        { type: "addResource", key: "gold", amount: 30 },
        { type: "addResource", key: "turns", amount: 0 },
      ],
      anchorBlockId: "entrance-desc",
    },
    {
      id: "explore-archives",
      type: "choice",
      source: "main-hall",
      target: "archives",
      text: "Explore the Dusty Archives",
      conditions: [{ type: "notVisited", nodeId: "archives" }],
      anchorBlockId: "hall-archives",
    },
    {
      id: "study-heal",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Study the Tome of Heal Spell",
      conditions: [{ type: "notVisited", nodeId: "study-heal" }],
      effects: [{ type: "grantEntity", entityId: "heal-spell" }],
      anchorBlockId: "archives-heal-tome",
    },
    {
      id: "study-mage-light",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Study the Tome of Mage Light Spell",
      conditions: [{ type: "notVisited", nodeId: "study-mage-light" }],
      effects: [{ type: "grantEntity", entityId: "mage-light" }],
      anchorBlockId: "archives-light-tome",
    },
    {
      id: "buy-lockpick",
      type: "choice",
      source: "archives",
      target: "archives",
      text: "Buy a lockpick from the spectral librarian (-15 gold)",
      conditions: [
        { type: "notVisited", nodeId: "buy-lockpick" },
        { type: "resourceAtLeast", key: "gold", value: 15 },
      ],
      effects: [
        { type: "spendResource", key: "gold", amount: 15, clampToZero: true },
        { type: "grantEntity", entityId: "lockpick" },
      ],
      anchorBlockId: "archives-librarian",
    },
    {
      id: "return-from-archives",
      type: "choice",
      source: "archives",
      target: "main-hall",
      text: "Return to the Main Hall",
      anchorBlockId: "archives-desc",
    },
    {
      id: "descend",
      type: "choice",
      source: "main-hall",
      target: "dark-chapter",
      text: "Descend into the passage using the lantern",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
      anchorBlockId: "hall-passage",
    },
    {
      id: "examine-glyphs",
      type: "choice",
      source: "dark-chapter",
      target: "chamber-of-runes",
      text: "Examine the glowing glyphs",
      anchorBlockId: "chapter-desc",
    },
    {
      id: "cast-mage-light",
      type: "choice",
      source: "dark-chapter",
      target: "chamber-of-runes",
      text: "Cast Mage Light Spell and proceed safely (-15 MP)",
      conditions: [
        { type: "hasEntity", entityId: "mage-light" },
        { type: "resourceAtLeast", key: "mana", value: 15 },
      ],
      effects: [
        { type: "spendResource", key: "mana", amount: 15, clampToZero: true },
      ],
      anchorBlockId: "chapter-desc",
    },
    {
      id: "cross-bridge",
      type: "choice",
      source: "dark-chapter",
      target: "collapsed-bridge",
      text: "Cross the crumbling bridge",
      effects: [{ type: "spendResource", key: "health", amount: 40, clampToZero: true }],
      anchorBlockId: "chapter-desc",
    },
    {
      id: "translate-runes",
      type: "choice",
      source: "chamber-of-runes",
      target: "forgotten-crypt",
      text: "Translate the runes using the lantern",
      conditions: [{ type: "hasEntity", entityId: "lantern" }],
      effects: [{ type: "grantEntity", entityId: "key" }],
      anchorBlockId: "runes-desc",
    },
    {
      id: "touch-pedestal",
      type: "choice",
      source: "chamber-of-runes",
      target: "chamber-of-runes",
      text: "Touch the central pedestal",
      effects: [{ type: "spendResource", key: "health", amount: 30, clampToZero: true }],
      anchorBlockId: "runes-desc",
    },
    {
      id: "return-to-chapter",
      type: "choice",
      source: "chamber-of-runes",
      target: "dark-chapter",
      text: "Return to the Dark Chapter",
      anchorBlockId: "runes-desc",
    },
    {
      id: "heal-with-elixir",
      type: "choice",
      source: "collapsed-bridge",
      target: "collapsed-bridge",
      text: "Drink the healing elixir (+50 HP)",
      conditions: [{ type: "hasEntity", entityId: "elixir" }],
      effects: [
        { type: "addResource", key: "health", amount: 50 },
        { type: "revokeEntity", entityId: "elixir" },
      ],
      anchorBlockId: "bridge-desc",
    },
    {
      id: "cast-heal",
      type: "choice",
      source: "collapsed-bridge",
      target: "collapsed-bridge",
      text: "Cast Heal Spell (+40 HP, -20 MP, 3t CD)",
      conditions: [
        { type: "hasEntity", entityId: "heal-spell" },
        { type: "resourceAtLeast", key: "mana", value: 20 },
        { type: "resourceLessThan", key: "heal_cooldown", value: 1 },
      ],
      effects: [
        { type: "addResource", key: "health", amount: 40 },
        { type: "spendResource", key: "mana", amount: 20, clampToZero: true },
        { type: "addResource", key: "heal_cooldown", amount: 3 },
      ],
      anchorBlockId: "bridge-desc",
    },
    {
      id: "climb-rubble",
      type: "choice",
      source: "collapsed-bridge",
      target: "forgotten-crypt",
      text: "Climb through the rubble (-20 HP)",
      conditions: [{ type: "resourceAtLeast", key: "health", value: 30 }],
      effects: [{ type: "spendResource", key: "health", amount: 20, clampToZero: true }],
      anchorBlockId: "bridge-desc",
    },
    {
      id: "succumb-to-injuries",
      type: "choice",
      source: "collapsed-bridge",
      target: "death",
      text: "Succumb to your injuries",
      anchorBlockId: "bridge-desc",
    },
    {
      id: "unlock-casket",
      type: "choice",
      source: "forgotten-crypt",
      target: "victory",
      text: "Unlock the iron casket",
      conditions: [{ type: "hasEntity", entityId: "key" }],
      anchorBlockId: "crypt-desc",
    },
    {
      id: "lockpick-casket",
      type: "choice",
      source: "forgotten-crypt",
      target: "victory",
      text: "Lockpick the iron casket",
      conditions: [{ type: "hasEntity", entityId: "lockpick" }],
      anchorBlockId: "crypt-desc",
    },
    {
      id: "die-at-crypt",
      type: "choice",
      source: "forgotten-crypt",
      target: "death",
      text: "Succumb to your wounds in the crypt",
      anchorBlockId: "crypt-desc",
    },
  ],
});
```

- [ ] **Step 2: Update the main.test.ts walks to parse blocks**

Read `apps/literature-rpg/src/main.test.ts` and ensure it asserts successfully.

- [ ] **Step 3: Regenerate metadata, build, and verify**

Run: `bun packages/cli/src/cli.ts generate --root-dir apps/literature-rpg/src && bun run build && bun test`
Expected: Success

- [ ] **Step 4: Commit changes**

```bash
git add apps/literature-rpg/src/graphs/story.graph.ts apps/literature-rpg/src/main.test.ts
git commit -m "feat(rpg): restructure story graph using rich blocks and anchored choices"
```

---

### Task 3: Update Clients to Render Block Pacing and Contextual Placements

**Files:**
- Modify: `apps/literature-rpg/src/main.ts` (render node blocks with terminal typing delay).
- Modify: `apps/literature-rpg-web/src/App.tsx` (group choices next to their anchored content blocks dynamically).

- [ ] **Step 1: Implement block delays in main.ts play loop**

Read `apps/literature-rpg/src/main.ts` and modify the display block area:

```typescript
    // Replace lines 42-53 with:
    // 3. Render blocks sequentially
    if (currentNode.blocks && currentNode.blocks.length > 0) {
      for (const block of currentNode.blocks) {
        let blockText = String(block.text || "");
        
        // Output block title/headers
        if (block.type === "header") {
          console.log(`\n${pc.bold(pc.underline(blockText))}\n`);
        } else if (block.type === "paragraph") {
          console.log(`\n${blockText}`);
        }

        // Pacing delay from generic metadata
        const delay = (block.metadata as any)?.delayAfterMs;
        if (typeof delay === "number" && delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    } else {
      // Fallback for simple nodes
      const body = String((currentNode as any).body || "");
      console.log(`\n${body}`);
    }

    const hp = state.entityState?.resources?.health ?? 0;
    const mp = state.entityState?.resources?.mana ?? 0;
    const gold = state.entityState?.resources?.gold ?? 0;
    const turns = state.entityState?.resources?.turns ?? 0;
    const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
    const inventory = Array.from(context.derivedState.ownedEntityIds);
    
    let hudText = `❤️ HP: ${hp} | 🧪 MP: ${mp} | 🪙 Gold: ${gold}g | 🕒 Turn: ${turns}`;
    if (turns > 10) {
      hudText += `\n⚠️ WARNING: THE CAVERN IS COLLAPSING! (-25 HP/t)`;
    }
    if (cooldown > 0) {
      hudText += ` | ⏳ CD: ${cooldown} turns`;
    }
    if (inventory.length > 0) {
      hudText += `\n🎒 Spells/Items: ${inventory.join(", ")}`;
    }
    
    console.log(`\n${pc.dim("─".repeat(50))}\n${pc.cyan(hudText)}\n${pc.dim("─".repeat(50))}\n`);
```

- [ ] **Step 2: Render block-anchored choices in App.tsx**

Read `apps/literature-rpg-web/src/App.tsx` and implement contextual rendering:

```typescript
  // Get dynamic state variables
  const health = state.entityState?.resources?.health ?? 0;
  const mana = state.entityState?.resources?.mana ?? 0;
  const gold = state.entityState?.resources?.gold ?? 0;
  const turns = state.entityState?.resources?.turns ?? 0;
  const cooldown = state.entityState?.resources?.heal_cooldown ?? 0;
  const isDead = state.currentNodeId === "death";
  const isVictory = state.currentNodeId === "victory";

  // Figure out what we have active from the derived state (e.g. 'lantern')
  const inventory = Array.from(context.derivedState.ownedEntityIds);

  // Group choices by anchorBlockId
  const anchoredChoices = new Map<string, typeof availableChoices>();
  const unanchoredChoices: typeof availableChoices = [];

  for (const choice of availableChoices) {
    const anchorId = choice.anchorBlockId;
    if (anchorId) {
      const existing = anchoredChoices.get(anchorId) ?? [];
      existing.push(choice);
      anchoredChoices.set(anchorId, existing);
    } else {
      unanchoredChoices.push(choice);
    }
  }

  // Inside return block: replace CardContent and CardFooter with:
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-xl overflow-hidden">
        <CardHeader className="border-b border-slate-800/60 pb-3">
          <CardTitle className="text-xl text-slate-200">
            {isDead ? "💀 Defeat!" : isVictory ? "🎉 VICTORY!" : (currentNode.properties as any)?.title ?? currentNode.id}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-4 flex flex-col gap-4">
          {isDead ? (
            <p className="text-slate-400 leading-relaxed text-md">
              You have succumbed to your wounds inside the library passage. Your vision fades into cold darkness...
            </p>
          ) : currentNode.blocks && currentNode.blocks.length > 0 ? (
            currentNode.blocks.map((block) => {
              const blockChoices = anchoredChoices.get(block.id) ?? [];
              return (
                <div key={block.id} className="flex flex-col gap-2 p-2 rounded hover:bg-slate-800/40 transition">
                  {block.type === "header" && (
                    <h3 className="text-lg font-bold text-slate-200">{block.text}</h3>
                  )}
                  {block.type === "paragraph" && (
                    <p className="text-slate-400 leading-relaxed text-md">{block.text}</p>
                  )}
                  {block.type === "image" && (
                    <div className="rounded overflow-hidden border border-slate-800">
                      <img src={block.url} alt={block.caption} className="w-full h-auto object-cover max-h-48" />
                      {block.caption && <p className="text-xs text-slate-500 p-1 bg-slate-950/40">{block.caption}</p>}
                    </div>
                  )}

                  {/* Render Choices anchored to this block inline */}
                  {blockChoices.length > 0 && (
                    <div className="flex flex-col gap-1.5 pt-2 border-t border-dashed border-slate-800/80 mt-1">
                      {blockChoices.map((choice) => {
                        const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
                        return (
                          <Button 
                            key={choice.id} 
                            onClick={() => step(choice)}
                            className="w-full justify-start text-left h-auto py-2 px-3 text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/40 rounded transition"
                          >
                            <span className="mr-1.5 text-slate-500">➤</span> {label}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Fallback for flat body nodes
            <p className="text-slate-400 leading-relaxed text-md">
              {(currentNode.properties as any)?.body as string}
            </p>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-3 pt-4 border-t border-slate-800 bg-slate-950/20">
          {isDead || isVictory || availableChoices.length === 0 ? (
            <div className="w-full text-center space-y-3 py-2">
              <div className="text-emerald-400 text-md font-semibold">
                {isDead ? "💥 GAME OVER 💥" : isVictory ? "🏆 ADVENTURE COMPLETE 🏆" : "✨ You have reached the end. ✨"}
              </div>
              <Button onClick={reset} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 text-sm font-semibold rounded">
                Play Again
              </Button>
            </div>
          ) : unanchoredChoices.length > 0 ? (
            // Render unanchored choices in the footer as fallback
            unanchoredChoices.map((choice) => {
              const label = choice.label ?? (choice.metadata as any)?.text ?? choice.id;
              return (
                <Button 
                  key={choice.id} 
                  onClick={() => step(choice)}
                  className="w-full justify-start text-left h-auto py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-800 hover:border-slate-700 rounded transition text-sm"
                >
                  <span className="mr-2 text-slate-500">➤</span> {label}
                </Button>
              );
            })
          ) : (
            // If all choices were anchored and rendered inline
            <span className="text-[10px] text-slate-500 text-center w-full italic py-1">Use the inline action prompts above to proceed.</span>
          )}
        </CardFooter>
      </Card>
```

- [ ] **Step 3: Run full typecheck and build**

Run: `bun run build && bun run typecheck`
Expected: Success

- [ ] **Step 4: Commit changes**

```bash
git add apps/literature-rpg/src/main.ts apps/literature-rpg-web/src/App.tsx
git commit -m "feat(web/cli): support contextual inline anchored choices and sequential block rendering"
```
