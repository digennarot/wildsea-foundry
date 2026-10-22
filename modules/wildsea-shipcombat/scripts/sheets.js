// Ship combat sheets: core's mixins on Foundry's ApplicationV2 document sheets

const {
  NpcShipSheetMixin,
  OrdnanceSheetMixin,
  ShipComponentSheetMixin,
  ShipSheetMixin,
} = globalThis.ShipCombat._api

const { HandlebarsApplicationMixin } = foundry.applications.api
const ActorSheetBase = HandlebarsApplicationMixin(
  foundry.applications.sheets.ActorSheetV2,
)
const ItemSheetBase = HandlebarsApplicationMixin(
  foundry.applications.sheets.ItemSheetV2,
)

// the adapter is not registered yet when these classes are defined
const CLASSES = ['wildsea-shipcombat']

export class ShipSheet extends ShipSheetMixin(ActorSheetBase) {
  static DEFAULT_OPTIONS = {
    classes: [...CLASSES, 'shipcombat-ship'],
    form: { submitOnChange: true },
  }
}

export class NpcShipSheet extends NpcShipSheetMixin(ActorSheetBase) {
  static DEFAULT_OPTIONS = {
    classes: [...CLASSES, 'shipcombat-ship', 'shipcombat-npc-ship'],
  }
}

export class OrdnanceSheet extends OrdnanceSheetMixin(ActorSheetBase) {
  static DEFAULT_OPTIONS = {
    classes: [...CLASSES],
  }
}

export class ShipComponentSheet extends ShipComponentSheetMixin(ItemSheetBase) {
  static DEFAULT_OPTIONS = {
    classes: [...CLASSES],
  }
}
