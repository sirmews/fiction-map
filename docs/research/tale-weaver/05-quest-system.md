# Tale Weaver — Quest System

> **Reference:** `/Users/nav/Projects/tale-weaver-stats` (as of 2026-04-29)

---

## QuestState Type

`domain/src/types.ts:24-27`:

```typescript
interface QuestState {
  stage: number;
  status: "inactive" | "active" | "completed" | "failed";
}
```

### Quest Stages

- `stage: 0` = not started
- `stage > 0` = in progress
- `status` changes based on effects applied

### Quest Effects

`domain/src/apply-choice.ts:134-140`:

```typescript
case "quest-stage":
  state.quests[effect.questId] = {
    stage: effect.value,
    status: effect.value > 0 ? "active" : "inactive",
  };
  consequence ??= { type: "questChange", questId: effect.questId };
  break;
```

Setting a quest stage to 0 makes it `inactive`, >0 makes it `active`.

---

## Quest Requirements in Choices/Actions

Condition type from `contracts/src/choice.contract.ts:48-53`:

```typescript
{
  type: "quest-stage",
  questId: string,
  comparison?: "gte" | "lte" | "eq",  // default: "gte"
  value: number,
}
```

Example: require quest stage >= 3 to unlock a choice.

---

## Storage in GameState/SessionState

`domain/src/types.ts:128`:

```typescript
quests: Record<string, QuestState>;
```

Tracked per playthrough, persisted server-side in `SessionState` (`contracts/src/session.contract.ts:39-45`).

---

## Quest Consequence Type

`domain/src/types.ts:139`:

```typescript
{ type: "questChange", questId?: string }
```

---

## Not Covered in Original Review

- **Quest stages are just numbers** — No named stages, no quest definitions stored as nodes
- **No quest-specific UI tracked** — Quest advancement via effects, no separate quest log node type
- **Status transitions** — Only `active`/`inactive` — no explicit "completed" or "failed" status set by effects (can be inferred by the game author via stages)