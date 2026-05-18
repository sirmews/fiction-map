import { ProjectRegistry } from "@fiction-map/core"
import type { EntityTypeDefinition, WorldDefinition } from "./types"

export class EntityRegistry extends ProjectRegistry {
  public entityTypes = new Map<string, EntityTypeDefinition>()
  public worlds = new Map<string, WorldDefinition>()

  public override clear(): void {
    super.clear()
    this.entityTypes.clear()
    this.worlds.clear()
  }
}
