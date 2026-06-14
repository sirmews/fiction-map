# Design Spec: RPG Spells, Mana, and Turn-Based Cooldowns

Date: 2026-06-14
Status: Draft

## Purpose

Implement an advanced, feature-packed RPG sandbox showcase in our reference applications (`apps/literature-rpg` and `apps/literature-rpg-web`). This expansion demonstrates:
1. **Dynamic Spell Learning:** Finding magical tomes to unlock spell casting capabilities.
2. **Mana/MP Pool:** Adding a regenerating `mana` pool (recovers 5 MP per step/turn via a trigger).
3. **Turn-Based Cooldowns:** Restricting spells (e.g., Heal) to be castable only once every 3 turns, powered by a global cooldown tick-down trigger.

## Requirements

1. **Entities & World Expansion:**
   - Add spell entities `heal-spell` and `mage-light` inside `apps/literature-rpg/src/world.ts`.
2. **Story Graph Expansion:**
   - Modify `apps/literature-rpg/src/graphs/story.graph.ts`:
     - Archives: Add choice `study-heal` to learn the Heal Spell.
     - Dark Chapter: Add choice `cast-mage-light` (requires `mage-light` spell and `15 mana`) to cross the chasm safely without needing the lantern.
     - Collapsed Bridge: Add choice `cast-heal` (requires `heal-spell` spell, `20 mana`, and `heal_cooldown < 1`). It heals `40 HP`, spends `20 MP`, and sets `heal_cooldown` to `3`.
3. **Global RPG Middleware (Triggers):**
   - Register **Mana Regeneration** trigger: If `mana < 50`, add `5 mana`.
   - Register **Cooldown Countdown** trigger: If `heal_cooldown >= 1`, subtract `1 heal_cooldown` (clamp to 0).
4. **TUI Game loop & HUD Integration:**
   - Update `main.ts` status bar to print:
     ```text
     ❤️ HP: 100 | 🧪 MP: 50 | ⏳ Heal Cooldown: 0 turns
     🎒 Spells Learned: heal-spell | Items: lantern, elixir
     ```
5. **React Web RPG HUD Integration:**
   - Update `App.tsx` with a dual progress bar displaying both **❤️ HP** (red) and **🧪 MP** (blue), along with countdown badges indicating active cooldown states.

---

## State & Pipeline Logic

```text
                  Player Casts Heal Spell
                             │
                             ▼
         Apply Effects (-20 MP, +40 HP, +3 Cooldown)
                             │
                             ▼
              Evaluate Reactive Triggers
                             │
        ┌────────────────────┴────────────────────┐
        ▼                                         ▼
   Mana Regen Trigger                      Cooldown Countdown
   (If mana < 50, +5 MP)                   (If cooldown >= 1, -1 turn)
        │                                         │
        ▼                                         ▼
  Return State (Mana = 35 MP, Cooldown = 2) ──► Block Cast choice
                                                until Cooldown = 0
```
