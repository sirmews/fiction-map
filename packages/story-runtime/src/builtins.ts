import { ProjectRegistry, defineCondition, defineEffect, type ConditionConfig, type EffectConfig } from "@fiction-map/core"

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

  // Conditions
  registerCondition({ id: "equals", parameters: { key: { type: "string", required: true }, value: { type: "string", required: true } } })
  registerCondition({ id: "notEquals", parameters: { key: { type: "string", required: true }, value: { type: "string", required: true } } })
  registerCondition({ id: "greaterThan", parameters: { key: { type: "string", required: true }, value: { type: "number", required: true } } })
  registerCondition({ id: "greaterThanOrEqual", parameters: { key: { type: "string", required: true }, value: { type: "number", required: true } } })
  registerCondition({ id: "lessThan", parameters: { key: { type: "string", required: true }, value: { type: "number", required: true } } })
  registerCondition({ id: "lessThanOrEqual", parameters: { key: { type: "string", required: true }, value: { type: "number", required: true } } })
  registerCondition({ id: "hasFlag", parameters: { key: { type: "string", required: true } } })
  registerCondition({ id: "flagEquals", parameters: { key: { type: "string", required: true }, value: { type: "string", required: true } } }) // value could be boolean, string, number
  registerCondition({ id: "visited", parameters: { nodeId: { type: "string", required: true } } })
  registerCondition({ id: "notVisited", parameters: { nodeId: { type: "string", required: true } } })
  registerCondition({ id: "currentNode", parameters: { nodeId: { type: "string", required: true } } })
  registerCondition({ id: "hasVariable", parameters: { key: { type: "string", required: true } } })
  
  // Entity conditions
  registerCondition({ id: "hasEntity", parameters: { entityId: { type: "string", required: true } } })
  registerCondition({ id: "entityActive", parameters: { entityId: { type: "string", required: true } } })
  registerCondition({ id: "entityUnlocked", parameters: { entityId: { type: "string", required: true } } })
  registerCondition({ id: "resourceAtLeast", parameters: { key: { type: "string", required: true }, value: { type: "number", required: true } } })

  // Effects
  registerEffect({ id: "setVariable", parameters: { key: { type: "string", required: true }, value: { type: "string", required: true } } })
  registerEffect({ id: "deleteVariable", parameters: { key: { type: "string", required: true } } })
  registerEffect({ id: "increment", parameters: { key: { type: "string", required: true }, delta: { type: "number", required: true } } })
  registerEffect({ id: "decrement", parameters: { key: { type: "string", required: true }, delta: { type: "number", required: true } } })
  registerEffect({ id: "clamp", parameters: { key: { type: "string", required: true }, min: { type: "number", required: true }, max: { type: "number", required: true } } })
  registerEffect({ id: "setFlag", parameters: { key: { type: "string", required: true }, value: { type: "boolean", required: true } } })
  registerEffect({ id: "clearFlag", parameters: { key: { type: "string", required: true } } })
  registerEffect({ id: "markVisited", parameters: { nodeId: { type: "string", required: true } } })
  registerEffect({ id: "navigate", parameters: { nodeId: { type: "string", required: true } } })
  registerEffect({ id: "noOp", parameters: {} })
  registerEffect({ id: "setExtension", parameters: { key: { type: "string", required: true }, value: { type: "string" } } })
  registerEffect({ id: "mergeExtension", parameters: { key: { type: "string", required: true }, value: { type: "string" } } })
  
  // Entity effects
  registerEffect({ id: "grantEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "revokeEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "activateEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "deactivateEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "unlockEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "lockEntity", parameters: { entityId: { type: "string", required: true } } })
  registerEffect({ id: "addResource", parameters: { key: { type: "string", required: true }, amount: { type: "number", required: true } } })
  registerEffect({ id: "spendResource", parameters: { key: { type: "string", required: true }, amount: { type: "number", required: true } } })
}
