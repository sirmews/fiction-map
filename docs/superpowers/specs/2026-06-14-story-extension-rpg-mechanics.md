# Design Spec: RPG Story Expansion & Engine Capabilities Showcase

Date: 2026-06-14
Status: Draft

## Purpose

Expand the reference consumer app `literature-rpg` and its Web UI companion to demonstrate more rich capabilities of the Fiction Map engine. This includes adding multi-branching paths, dynamic item gathering (lantern, healing elixir, casket key), and a numeric resource tracking system representing player health (starting at 100 HP, suffering damage on traps, healing from items, and gating actions).

## Requirements

1. **Entities & World Expansion:**
   - Add items `elixir` (Healing Elixir) and `key` (Casket Key) alongside the `lantern` inside `apps/literature-rpg/src/world.ts`.
2. **Dynamic Story Graph Expansion:**
   - Introduce 6 new scenes inside `apps/literature-rpg/src/graphs/story.graph.ts`: `Dusty Archives`, `Chamber of Runes`, `Collapsed Bridge`, `Forgotten Crypt`, `Victory!`, and `Defeat` (Game Over).
   - Use dynamic conditions like `resourceAtLeast` (requiring health to climb rubble) and effects like `spendResource` (traps dealing damage) or `addResource` (drinking elixir restoring HP).
   - Implement logical branch paths (e.g. searching archives for an optional healing elixir, puzzle-solving in runes vs. crossing a trapped bridge).
3. **Interactive Terminal Game HUD:**
   - Enhance the TUI game (`apps/literature-rpg/src/main.ts`) to print a clean console HUD displaying the player's current health bar and active inventory items.
4. **Interactive Web RPG Interface:**
   - Enhance the React Web UI (`apps/literature-rpg-web/src/App.tsx`) with a beautiful, stylized red health bar and status header matching Tailwind v4 + Shadcn guidelines.

---

## Story & State Flows

```text
                  ┌──────────────┐
                  │   Entrance   │ (grants lantern, 100 HP)
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐      explore       ┌──────────────┐
                  │  Main Hall   │ ◄────────────────► │   Archives   │ (grants elixir)
                  └──────┬───────┘                    └──────────────┘
                         │
                         ▼ (requires lantern)
                  ┌──────────────┐
                  │ Dark Chapter │
                  └────┬────┬────┘
                       │    │
      examine glyphs   │    │ cross bridge (-40 HP)
     ┌─────────────────┘    └─────────────────┐
     ▼                                        ▼
┌──────────────┐                      ┌────────────────┐
│ Runes Room   │ ◄─────────────────── │Collapsed Bridge│ ◄──┐ (healing loop:
└────┬─────────┘                      └──────┬─────────┘ └──┘  use elixir)
     │                                       │
     │ translate runes                       │ climb rubble
     │ (requires lantern;                    │ (requires >= 30 HP,
     │  grants casket key)                   │  costs 20 HP)
     ▼                                       ▼
┌──────────────┐                      ┌────────────────┐
│ForgottenCrypt│ ◄────────────────────┤ ForgottenCrypt │
└────┬─────────┘                      └──────┬─────────┘
     │                                       │
     │ unlock casket                         │ succumb to injuries
     ▼                                       ▼
┌──────────────┐                      ┌────────────────┐
│   Victory!   │                      │  Game Over     │
└──────────────┘                      └────────────────┘
```
