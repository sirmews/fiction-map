import type {
  Condition,
  EdgeBlueprint,
  Effect,
  EnumerationRequest,
} from "./generated/pathEnumeration"

function graph(edges: EdgeBlueprint[], ids = ["start", "work", "done"]): EnumerationRequest {
  return { blueprint: { nodes: ids.map((id) => ({ id })), edges } }
}

function edge(
  id: string,
  source: string,
  target?: string,
  details: Partial<EdgeBlueprint> = {},
): EdgeBlueprint {
  return { id, source, target, ...details }
}

const mutations: Effect[] = [
  { type: "increment", key: "absent", delta: 3 },
  { type: "setVariable", key: "score", value: 4 },
  { type: "increment", key: "score", delta: 8 },
  { type: "decrement", key: "score", delta: 2 },
  { type: "clamp", key: "score", min: 0, max: 7 },
  { type: "setVariable", key: "gone", value: "gone" },
  { type: "deleteVariable", key: "gone" },
  { type: "setVariable", key: "object", value: { a: [1, "x"] } },
  { type: "setFlag", key: "falseFlag", value: false },
  { type: "setFlag", key: "removeFlag", value: true },
  { type: "clearFlag", key: "removeFlag" },
  { type: "markVisited", nodeId: "off-route" },
  { type: "grantEntity", entityId: "z" },
  { type: "grantEntity", entityId: "a" },
  { type: "grantEntity", entityId: "removeMe" },
  { type: "revokeEntity", entityId: "removeMe" },
  { type: "activateEntity", entityId: "z" },
  { type: "activateEntity", entityId: "a" },
  { type: "deactivateEntity", entityId: "z" },
  { type: "unlockEntity", entityId: "portal" },
  { type: "unlockEntity", entityId: "locked-again" },
  { type: "lockEntity", entityId: "locked-again" },
  { type: "addResource", key: "score", amount: 2 },
  { type: "addResource", key: "health", formula: "(score + -1) * 5 / 0 + 3" },
  { type: "spendResource", key: "health", amount: 8 },
  { type: "spendResource", key: "health", amount: 8, clampToZero: true },
  { type: "spendResource", key: "credit", amount: 8, allowNegative: true },
  { type: "setExtension", key: "note", value: { initial: 1, old: 2 } },
  { type: "mergeExtension", key: "note", value: { old: 3, latest: 4 } },
  { type: "setVariable", key: "__proto__", value: 99 },
  { type: "setFlag", key: "constructor", value: true },
  { type: "addResource", key: "prototype", amount: 1 },
  { type: "navigate", nodeId: "side-trip" },
  { type: "noOp" },
]
const gates: Condition[] = [
  { type: "equals", key: "score", value: 7 },
  { type: "notEquals", key: "object", value: { a: [1, "x"] } },
  { type: "hasVariable", key: "score" },
  { type: "greaterThan", key: "score", value: 3 },
  { type: "greaterThanOrEqual", key: "score", value: 7 },
  { type: "lessThan", key: "score", value: 8 },
  { type: "lessThanOrEqual", key: "score", value: 7 },
  { type: "hasFlag", key: "falseFlag" },
  { type: "notFlag", key: "falseFlag" },
  { type: "flagEquals", key: "falseFlag", value: false },
  { type: "visited", nodeId: "off-route" },
  { type: "notVisited", nodeId: "done" },
  { type: "currentNode", nodeId: "work" },
  { type: "hasEntity", entityId: "z" },
  { type: "entityActive", entityId: "a" },
  { type: "entityUnlocked", entityId: "portal" },
  { type: "resourceAtLeast", key: "health", value: 0 },
  { type: "resourceLessThan", key: "credit", value: -7 },
]

export const allBuiltins = { conditions: gates, effects: mutations }

export function differentialCases(): { name: string; request: EnumerationRequest }[] {
  const cases = [
    {
      name: "every registered built-in and serialized state",
      request: graph([
        edge("prep", "start", "work", { effects: mutations }),
        edge("confirm", "work", "done", { conditions: gates }),
      ]),
    },
    {
      name: "context-derived owned, active and effective entities",
      request: {
        ...graph([
          edge("confirm", "start", "done", {
            conditions: [
              { type: "hasEntity", entityId: "placed" },
              { type: "entityActive", entityId: "equipped" },
              { type: "entityUnlocked", entityId: "via-unlock" },
            ],
          }),
        ]),
        context: {
          derivedState: {
            ownedEntityIds: ["placed"],
            activeEntityIds: ["equipped"],
            effectiveEntityIds: ["via-unlock"],
          },
        },
      },
    },
    {
      name: "trigger order and per-step cap",
      request: {
        ...graph([
          edge("approach", "start", "work"),
          edge("confirm", "work", "done", { conditions: [{ type: "hasFlag", key: "opened" }] }),
        ]),
        triggers: [
          {
            id: "forward",
            conditions: [{ type: "hasFlag", key: "ready" }],
            effects: [{ type: "setFlag", key: "opened", value: true }],
          },
          {
            id: "previous",
            conditions: [{ type: "visited", nodeId: "work" }],
            effects: [{ type: "setFlag", key: "ready", value: true }],
          },
          ...Array.from({ length: 5 }, (_, index) => ({
            id: `unconditional-${index}`,
            conditions: [],
            effects: [{ type: "setFlag", key: `applied-${index}`, value: true }],
          })),
        ],
      },
    },
    {
      name: "automatic failure on later sibling before applying the path cap",
      request: {
        blueprint: {
          nodes: [{ id: "start" }, { id: "done" }, { id: "loop", autoResolve: true }],
          edges: [
            edge("finish", "start", "done"),
            edge("enter-loop", "start", "loop"),
            edge("loop", "loop", "loop"),
          ],
        },
        maxPaths: 1,
      },
    },
    {
      name: "unknown condition and effect, blocked failure effects, targetless navigation",
      request: graph([
        edge("blocked", "start", "done", {
          conditions: [{ type: "unregistered-condition" }],
          failureEffects: [{ type: "setFlag", key: "shouldNotFire", value: true }],
          failureTarget: "done",
        }),
        edge("jump", "start", undefined, {
          effects: [{ type: "unregistered-effect" }, { type: "navigate", nodeId: "work" }],
        }),
        edge("finish", "work", "done"),
      ]),
    },
    {
      name: "numeric overflow retains JS number behavior",
      request: graph([
        edge("calculate", "start", "work", {
          effects: [
            { type: "setVariable", key: "limit", value: 1e308 },
            { type: "increment", key: "limit", delta: 1e308 },
            { type: "addResource", key: "limit", amount: 1e308 },
            { type: "addResource", key: "limit", amount: 1e308 },
          ],
        }),
        edge("finish", "work", "done", {
          conditions: [
            { type: "greaterThan", key: "limit", value: 1e308 },
            { type: "resourceAtLeast", key: "limit", value: 1e308 },
          ],
        }),
      ]),
    },
    {
      name: "object with noncallable toString raises a TypeError",
      request: graph([
        edge("assign", "start", "done", {
          effects: [{ type: "setVariable", key: "bad", value: { toString: "blocked" } }],
        }),
      ]),
    },
    { name: "empty blueprint and inferred missing start", request: graph([], []) },
    { name: "zero maxPaths", request: { ...graph([]), maxPaths: 0 } },
    { name: "negative maxDepth", request: { ...graph([]), maxDepth: -3 } },
    {
      name: "fractional path cap preserves the first two branches",
      request: {
        ...graph(
          [edge("b", "start", "b"), edge("a", "start", "a"), edge("c", "start", "c")],
          ["start", "a", "b", "c"],
        ),
        maxPaths: 1.5,
      },
    },
    {
      name: "explicit empty endings and an empty edge target",
      request: {
        blueprint: {
          nodes: [{ id: "start" }, { id: "leaf" }],
          edges: [edge("empty", "start", ""), edge("leaf", "start", "leaf")],
          endings: [],
        },
      },
    },
    {
      name: "extension object spread preserves UTF-16 code units across repeated merges",
      request: graph([
        edge("prep", "start", "work", {
          effects: [
            { type: "setExtension", key: "note", value: "😀" },
            { type: "mergeExtension", key: "note", value: { named: true } },
            { type: "mergeExtension", key: "note", value: { another: true } },
          ],
        }),
        edge("finish", "work", "done"),
      ]),
    },
    {
      name: "initial entity removal, inverted clamping and numeric resource substitutions",
      request: graph([
        edge("prep", "start", "work", {
          effects: [
            { type: "revokeEntity", entityId: "never-owned" },
            { type: "setVariable", key: "score", value: 1 },
            { type: "clamp", key: "score", min: 7, max: 3 },
            { type: "setVariable", key: "tiny", value: 1e-7 },
            { type: "addResource", key: "formula", formula: "+tiny * 1 + score" },
          ],
        }),
        edge("finish", "work", "done"),
      ]),
    },
  ]

  const rejectedGates: Condition[] = [
    { type: "equals", key: "score", value: "7" },
    { type: "notEquals", key: "score", value: 7 },
    { type: "hasVariable", key: "absent" },
    { type: "greaterThan", key: "score", value: 7 },
    { type: "greaterThanOrEqual", key: "score", value: 8 },
    { type: "lessThan", key: "score", value: 7 },
    { type: "lessThanOrEqual", key: "score", value: 6 },
    { type: "hasFlag", key: "absent" },
    { type: "notFlag", key: "truthy" },
    { type: "flagEquals", key: "falseFlag", value: "false" },
    { type: "visited", nodeId: "done" },
    { type: "notVisited", nodeId: "off-route" },
    { type: "currentNode", nodeId: "done" },
    { type: "hasEntity", entityId: "missing" },
    { type: "entityActive", entityId: "z" },
    { type: "entityUnlocked", entityId: "locked-again" },
    { type: "resourceAtLeast", key: "health", value: 1 },
    { type: "resourceLessThan", key: "credit", value: -8 },
  ]
  for (const condition of rejectedGates) {
    cases.push({
      name: `failed ${condition.type} condition`,
      request: graph([
        edge("prep", "start", "work", {
          effects: [...mutations, { type: "setFlag", key: "truthy", value: "yes" }],
        }),
        edge("confirm", "work", "done", { conditions: [condition] }),
      ]),
    })
  }

  let seed = 0x7f28ab
  const random = (modulus: number) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return (seed >>> 8) % modulus
  }
  for (let index = 0; index < 200; index++) {
    const ids = ["start", "中", "z|,:", "a", "done"]
    const edges = Array.from({ length: 14 }, (_, edgeIndex) => {
      const source = ids[random(ids.length - 1)]
      const target = ids[random(ids.length)]
      const nodeId = ids[random(ids.length)]
      const key = `gate-${random(3)}`
      const condition = [{ type: random(2) ? "visited" : "notVisited", nodeId }]
      return edge(`choice-${edgeIndex}`, source, target, {
        conditions: random(3) ? undefined : condition,
        visibility: random(3) ? undefined : condition,
        effects: random(3) ? [{ type: "setFlag", key, value: !!random(2) }] : undefined,
      })
    })
    cases.push({
      name: `deterministic generated graph ${index}`,
      request: { ...graph(edges, ids), maxDepth: random(9), maxPaths: random(12) },
    })
  }
  return cases
}
