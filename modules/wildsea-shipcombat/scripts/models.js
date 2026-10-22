// Data models of the ship combat actor and item types: core's schemas on
// Foundry's TypeDataModel, as the Wildsea system has no data models of its own

const {
  NpcShipSchemaMixin,
  OrdnanceSchemaMixin,
  ShipComponentSchemaMixin,
  ShipSchemaMixin,
} = globalThis.ShipCombat._api

// Core's schema mixins extend super.defineSchema(), which TypeDataModel
// leaves abstract
class ShipCombatModel extends foundry.abstract.TypeDataModel {
  static defineSchema() {
    return {}
  }
}

// Runs core's preparation pipeline (stubs, movement, armour, hull display)
class ShipCombatActorModel extends ShipCombatModel {
  prepareBaseData() {
    super.prepareBaseData?.()
    this.computeBase()
  }

  prepareDerivedData() {
    super.prepareDerivedData?.()
    this.computeDerived()
  }
}

export class ShipModel extends ShipSchemaMixin(ShipCombatActorModel) {}

export class NpcShipModel extends NpcShipSchemaMixin(ShipCombatActorModel) {}

export class ShipOrdnanceModel extends OrdnanceSchemaMixin(
  ShipCombatActorModel,
) {}

export class ShipComponentModel extends ShipComponentSchemaMixin(
  ShipCombatModel,
) {}
