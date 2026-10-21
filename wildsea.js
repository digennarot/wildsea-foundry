import { WILDSEA, registerSystemSettings } from './system/config.js'
import {
  loadHandlebarsHelpers,
  loadHandlebarsPartials,
} from './system/preload.js'
import WildseaActor from './system/actor.js'
import { addDiceColor } from './system/dice.js'
import WildseaAspectSheet from './system/sheets/aspect.js'
import WildseaAttributeSheet from './system/sheets/attribute.js'
import WildseaDicePool from './system/applications/dice_pool.js'
import WildseaItem from './system/item.js'
import WildseaJournalSheet from './system/sheets/journal.js'
import WildseaPlayerSheet from './system/sheets/player.js'
import WildseaResourceSheet from './system/sheets/resource.js'
import WildseaShipSheet from './system/sheets/ship.js'
import WildseaShipItemSheet from './system/sheets/ship_item.js'
import WildseaAdversarySheet from './system/sheets/adversary.js'
import WildseaNpcSheet from './system/sheets/npc.js'
import { setupEnrichers } from './system/enrichers.js'
import { runMigrations } from './system/migrations.js'
import {
  ensureActiveScene,
  readyCinema,
  registerCinemaSettings,
  setupCinema,
} from './system/cinema.js'

import * as WildseaTracks from './system/applications/tracks/index.js'
import * as WildseaFocus from './system/applications/focus/index.js'
import * as WildseaDiceTray from './system/applications/dice_tray/index.js'

Hooks.once('init', () => {
  console.log('wildsea | Initializing')

  registerSystemSettings()
  registerCinemaSettings()

  if (game.settings.get('wildsea', 'showDepth'))
    WILDSEA.shipRatings.push('depth')

  CONFIG.wildsea = WILDSEA
  CONFIG.ActiveEffect.legacyTransferral = false
  game.wildsea = {}

  WildseaTracks.setup()
  WildseaFocus.setup()
  WildseaDiceTray.setup()
  setupCinema()

  loadHandlebarsPartials()
  loadHandlebarsHelpers()
  setupEnrichers()

  CONFIG.Actor.documentClass = WildseaActor
  CONFIG.Item.documentClass = WildseaItem

  Actors.unregisterSheet('core', ActorSheet)
  Actors.registerSheet('wildsea', WildseaPlayerSheet, { types: ['player'] })
  Actors.registerSheet('wildsea', WildseaShipSheet, { types: ['ship'] })
  Actors.registerSheet('wildsea', WildseaAdversarySheet, { types: ['hazard'] })
  Actors.registerSheet('wildsea', WildseaNpcSheet, { types: ['npc'] })

  Items.unregisterSheet('core', ItemSheet)
  Items.registerSheet('wildsea', WildseaAspectSheet, {
    types: ['aspect', 'temporaryTrack'],
  })
  Items.registerSheet('wildsea', WildseaResourceSheet, { types: ['resource'] })
  Items.registerSheet('wildsea', WildseaShipItemSheet, {
    types: ['design', 'fitting', 'undercrew'],
  })
  Items.registerSheet('wildsea', WildseaAttributeSheet, {
    types: ['attribute'],
  })

  Journal.unregisterSheet('core', JournalSheet)
  Journal.registerSheet('wildsea', WildseaJournalSheet)

  // TinyMCE is gone in Foundry 14
  if (CONFIG.TinyMCE)
    CONFIG.TinyMCE.content_css = `${WILDSEA.root_path}/styles/tinymce.css`
})

// Compendium translations, applied by the Babele module when it is active
Hooks.once('babele.init', (babele) => {
  babele.setSystemTranslationsDir('lang/compendium')
})

Hooks.once('ready', async () => {
  await runMigrations()
  await readyCinema()
  await ensureActiveScene()
})

Hooks.on('ready', async () => {
  game.wildsea.dicePool = new WildseaDicePool()
})

Hooks.on('renderJournalPageSheet', (_obj, html) => {
  html = $(html)
  if (game.user.isGM) {
    html.on('click', '.track', async (event) => {
      const data = event.currentTarget.dataset
      console.log(data)

      const result = await game.wildsea.trackDatabase.showTrackDialog(
        'wildsea.TRACKS.addTrack',
        data,
      )
      if (result.cancelled) return
      game.wildsea.trackDatabase.addTrack({ ...result })
    })
  }
})

Hooks.on('renderSceneControls', (_controls, html) => {
  html = $(html)
  const dicePoolButton = $(
    `<li class="dice-pool-control" data-control="dice-pool" data-tooltip="${game.i18n.localize(
      'wildsea.dicePoolTitle',
    )}">
        <i class="fas fa-dice"></i>
        <ol class="control-tools">
        </ol>
    </li>`,
  )

  html.find('.main-controls').append(dicePoolButton)
  html
    .find('.dice-pool-control')
    .removeClass('control-tool')
    .on('click', async () => {
      await game.wildsea.dicePool.toggle()
    })
})

Hooks.once('diceSoNiceReady', (dice3d) => {
  const dark = '#2e2c20'
  const mid = '#626256'
  const light = '#858778'

  addDiceColor(dice3d, 'wildsea-dark', 'Dark', dark)
  addDiceColor(dice3d, 'wildsea-mid', 'Mid', mid)
  addDiceColor(dice3d, 'wildsea-light', 'Light', light)
})
