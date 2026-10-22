/**
 * wildsea-shipcombat – The Wildsea companion for causodes-shipcombat-core.
 *
 * Activates the system-agnostic ship combat engine with a Wildsea adapter
 * (d6 pools, edges and skills, damage types) and registers its actor and
 * item types. The engine owns everything else: sheets' contents, canvas
 * overlays, sockets, templates.
 *
 * The Wildsea system handles naval battles as the rulebook describes them
 * (raider ships, attacks from the ship sheet) without this module; this is
 * an optional, tactical layer on top.
 */

const ShipCombat = await new Promise((resolve, reject) => {
  if (globalThis.ShipCombat?._api) {
    resolve(globalThis.ShipCombat)
    return
  }

  const timeout = setTimeout(() => {
    reject(
      new Error(
        'wildsea-shipcombat | Core API did not become available during module startup.',
      ),
    )
  }, 10_000)
  Hooks.once('shipCombatApiReady', (api) => {
    clearTimeout(timeout)
    resolve(api)
  })
})

const [
  { MODULE_ID, WildseaAdapter },
  { ShipModel, NpcShipModel, ShipOrdnanceModel, ShipComponentModel },
  { ShipSheet, NpcShipSheet, OrdnanceSheet, ShipComponentSheet },
] = await Promise.all([
  import('./scripts/wildsea-adapter.js'),
  import('./scripts/models.js'),
  import('./scripts/sheets.js'),
])

// Must happen at module evaluation, before the "init" hook
ShipCombat.configure({
  moduleId: MODULE_ID,
  adapter: new WildseaAdapter(),
})

Hooks.once('init', () => {
  if (game.system.id !== 'wildsea') {
    console.warn(`${MODULE_ID} | requires the Wildsea system`)
    return
  }

  Object.assign(CONFIG.Actor.dataModels, {
    [`${MODULE_ID}.ship`]: ShipModel,
    [`${MODULE_ID}.npcShip`]: NpcShipModel,
    [`${MODULE_ID}.shipOrdnance`]: ShipOrdnanceModel,
  })
  Object.assign(CONFIG.Item.dataModels, {
    [`${MODULE_ID}.component`]: ShipComponentModel,
  })

  for (const type of ['ship', 'npcShip', 'shipOrdnance'])
    CONFIG.Actor.typeLabels[`${MODULE_ID}.${type}`] =
      `TYPES.Actor.${MODULE_ID}.${type}`
  CONFIG.Item.typeLabels[`${MODULE_ID}.component`] =
    `TYPES.Item.${MODULE_ID}.component`

  const { DocumentSheetConfig } = foundry.applications.apps
  const register = (documentClass, sheet, type, label) =>
    DocumentSheetConfig.registerSheet(documentClass, MODULE_ID, sheet, {
      types: [`${MODULE_ID}.${type}`],
      makeDefault: true,
      label,
    })

  register(Actor, ShipSheet, 'ship', 'SHIPCOMBAT.Sheet.Ship')
  register(Actor, NpcShipSheet, 'npcShip', 'SHIPCOMBAT.Sheet.NpcShip')
  register(Actor, OrdnanceSheet, 'shipOrdnance', 'SHIPCOMBAT.Sheet.Torpedo')
  register(Item, ShipComponentSheet, 'component', 'SHIPCOMBAT.Sheet.Component')
})
