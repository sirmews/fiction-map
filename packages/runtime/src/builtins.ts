import {
  type ConditionConfig,
  defineCondition,
  defineEffect,
  type EffectConfig,
  type ProjectRegistry,
} from "@fiction-map/core"

export const builtinConditionConfigs: ConditionConfig[] = [
  {
    id: "equals",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "string", required: true },
    },
  },
  {
    id: "notEquals",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "string", required: true },
    },
  },
  {
    id: "greaterThan",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
  {
    id: "greaterThanOrEqual",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
  {
    id: "lessThan",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
  {
    id: "lessThanOrEqual",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
  { id: "hasFlag", parameters: { key: { type: "string", required: true } } },
  { id: "notFlag", parameters: { key: { type: "string", required: true } } },
  {
    id: "flagEquals",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "string", required: true },
    },
  },
  { id: "visited", parameters: { nodeId: { type: "string", required: true } } },
  { id: "notVisited", parameters: { nodeId: { type: "string", required: true } } },
  { id: "currentNode", parameters: { nodeId: { type: "string", required: true } } },
  { id: "hasVariable", parameters: { key: { type: "string", required: true } } },
  { id: "hasEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "entityActive", parameters: { entityId: { type: "string", required: true } } },
  { id: "entityUnlocked", parameters: { entityId: { type: "string", required: true } } },
  {
    id: "resourceAtLeast",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
  {
    id: "resourceLessThan",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "number", required: true },
    },
  },
]

export const builtinEffectConfigs: EffectConfig[] = [
  {
    id: "setVariable",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "string", required: true },
    },
  },
  { id: "deleteVariable", parameters: { key: { type: "string", required: true } } },
  {
    id: "increment",
    parameters: {
      key: { type: "string", required: true },
      delta: { type: "number", required: true },
    },
  },
  {
    id: "decrement",
    parameters: {
      key: { type: "string", required: true },
      delta: { type: "number", required: true },
    },
  },
  {
    id: "clamp",
    parameters: {
      key: { type: "string", required: true },
      min: { type: "number", required: true },
      max: { type: "number", required: true },
    },
  },
  {
    id: "setFlag",
    parameters: {
      key: { type: "string", required: true },
      value: { type: "boolean", required: true },
    },
  },
  { id: "clearFlag", parameters: { key: { type: "string", required: true } } },
  { id: "markVisited", parameters: { nodeId: { type: "string", required: true } } },
  { id: "navigate", parameters: { nodeId: { type: "string", required: true } } },
  { id: "noOp", parameters: {} },
  {
    id: "setExtension",
    parameters: { key: { type: "string", required: true }, value: { type: "string" } },
  },
  {
    id: "mergeExtension",
    parameters: { key: { type: "string", required: true }, value: { type: "string" } },
  },
  { id: "grantEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "revokeEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "activateEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "deactivateEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "unlockEntity", parameters: { entityId: { type: "string", required: true } } },
  { id: "lockEntity", parameters: { entityId: { type: "string", required: true } } },
  {
    id: "addResource",
    parameters: {
      key: { type: "string", required: true },
      amount: { type: "number", required: true },
    },
  },
  {
    id: "spendResource",
    parameters: {
      key: { type: "string", required: true },
      amount: { type: "number", required: true },
      allowNegative: { type: "boolean" },
      clampToZero: { type: "boolean" },
    },
  },
]

/**
 * Register all built-in conditions and effects into the given registry.
 * This ensures the metadata generator and validation can see the built-ins.
 *
 * @param registry The project registry
 */
export function registerBuiltins(registry: ProjectRegistry): void {
  const registerCondition = (config: ConditionConfig) => {
    if (!registry.conditions.has(config.id)) {
      defineCondition(registry, config)
    }
  }

  const registerEffect = (config: EffectConfig) => {
    if (!registry.effects.has(config.id)) {
      defineEffect(registry, config)
    }
  }

  for (const config of builtinConditionConfigs) {
    registerCondition(config)
  }

  for (const config of builtinEffectConfigs) {
    registerEffect(config)
  }
}
