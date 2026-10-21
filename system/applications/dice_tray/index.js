import { clamp, renderTemplate } from '../../helpers.js'
import { CONTEXTS, MAX_CUT, MAX_DICE, rollTray } from './roll.js'

const DIE_ICONS = ['one', 'two', 'three', 'four', 'five', 'six']
const POSITION_SETTING = 'diceTrayPosition'
const MARGIN = 8

// Each client keeps its own tray selection; cut and "no pool" reset after a
// roll because they belong to a single action.
const state = { dice: 1, cut: 0, context: 'action', noPool: false }
let rolling = false

const sync = (tray) => {
  for (const button of tray.querySelectorAll('[data-dice]')) {
    const count = Number(button.dataset.dice)
    button.classList.toggle('active', count <= state.dice)
    button.classList.toggle('selected', count === state.dice)
    button.disabled = rolling || state.noPool
  }

  tray.querySelector('.tray-cut-value').textContent = state.cut
  tray.querySelector('[data-tray-action="cutDown"]').disabled =
    rolling || state.noPool || state.cut <= 0
  tray.querySelector('[data-tray-action="cutUp"]').disabled =
    rolling || state.noPool || state.cut >= MAX_CUT
  tray.querySelector('.tray-context').value = state.context
  tray.querySelector('.tray-no-pool').checked = state.noPool
  tray.querySelector('[data-tray-action="roll"]').disabled = rolling
  tray.querySelector('.tray-roll-label').textContent = game.i18n.format(
    'wildsea.TRAY.roll',
    { dice: state.noPool ? 1 : state.dice },
  )
}

const roll = async (tray) => {
  if (rolling) return
  rolling = true
  sync(tray)

  try {
    await rollTray({ ...state })
  } catch (error) {
    console.error('wildsea | Dice tray roll failed', error)
    ui.notifications.error(game.i18n.localize('wildsea.TRAY.rollFailed'))
  } finally {
    rolling = false
    state.cut = 0
    state.noPool = false
    sync(tray)
  }
}

// --- Position ------------------------------------------------------------

// Left edge of the controls that sit just left of the chat input (such as
// the cinematic mode's panel and portrait toggles), found by probing the
// strip beside the input so it works whichever module draws them.
const controlsLeftEdge = (input) => {
  let edge = input.left
  const rows = [input.top + input.height * 0.25, input.top + input.height * 0.75]
  for (let x = input.left - 2; x > input.left - 200; x -= 4) {
    let hit = false
    for (const y of rows) {
      const control = document
        .elementFromPoint(x, y)
        ?.closest('button, a, [data-action], [data-tooltip], .ui-control')
      if (!control || control.closest('#hotbar')) continue
      const rect = control.getBoundingClientRect()
      if (rect.width > 64) continue
      hit = true
      edge = Math.min(edge, rect.left)
    }
    if (!hit && x < edge - MARGIN * 2) break
  }
  return edge
}

// Default spot: beside the floating chat input, left of the controls next to
// it and bottom-aligned with it. When the input is inside the sidebar or the
// chat popout (or hidden), bottom right just left of the sidebar and the chat
// notifications. Either way the tray never covers incoming messages, and it
// moves above the hotbar when the two would overlap.
const defaultPosition = (tray) => {
  const { width, height } = tray.getBoundingClientRect()
  let left
  let top = window.innerHeight - height - MARGIN * 2

  const inputElement = document.getElementById('chat-message')
  const floating = !inputElement?.closest('#sidebar, #chat-popout')
  const input = inputElement?.getBoundingClientRect()
  if (floating && input?.width && input.height) {
    // Keep the tray out of the probe while measuring.
    tray.style.pointerEvents = 'none'
    left = controlsLeftEdge(input) - width - MARGIN
    tray.style.pointerEvents = ''
    top = input.bottom - height
  } else {
    const right =
      document.getElementById('ui-right')?.getBoundingClientRect().left ??
      window.innerWidth
    left = right - width - MARGIN * 2
  }

  const hotbar = document.getElementById('hotbar')?.getBoundingClientRect()
  if (hotbar?.width && left < hotbar.right && left + width > hotbar.left)
    top = Math.min(top, hotbar.top - height - MARGIN)

  return { left, top }
}

const applyPosition = (tray, { left, top }) => {
  const { width, height } = tray.getBoundingClientRect()
  tray.style.left = `${clamp(left, window.innerWidth - width - MARGIN, MARGIN)}px`
  tray.style.top = `${clamp(top, window.innerHeight - height - MARGIN, MARGIN)}px`
}

const restorePosition = (tray) => {
  const saved = game.settings.get('wildsea', POSITION_SETTING)
  const hasSaved = Number.isFinite(saved?.left) && Number.isFinite(saved?.top)
  applyPosition(tray, hasSaved ? saved : defaultPosition(tray))
}

const makeDraggable = (tray) => {
  const handle = tray.querySelector('.tray-handle')

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    event.preventDefault()
    const rect = tray.getBoundingClientRect()
    const offsetX = event.clientX - rect.left
    const offsetY = event.clientY - rect.top
    handle.setPointerCapture(event.pointerId)

    const move = (moveEvent) =>
      applyPosition(tray, {
        left: moveEvent.clientX - offsetX,
        top: moveEvent.clientY - offsetY,
      })
    const drop = () => {
      handle.removeEventListener('pointermove', move)
      handle.removeEventListener('pointerup', drop)
      handle.removeEventListener('pointercancel', drop)
      game.settings.set('wildsea', POSITION_SETTING, {
        left: parseFloat(tray.style.left),
        top: parseFloat(tray.style.top),
      })
    }

    handle.addEventListener('pointermove', move)
    handle.addEventListener('pointerup', drop)
    handle.addEventListener('pointercancel', drop)
  })

  // Double-click on the handle puts the tray back in its default spot.
  handle.addEventListener('dblclick', async () => {
    await game.settings.set('wildsea', POSITION_SETTING, {})
    applyPosition(tray, defaultPosition(tray))
  })

  window.addEventListener('resize', () => restorePosition(tray))

  // An unmoved tray follows the chat input when the sidebar or the
  // cinematic mode moves it, once the animation settles.
  const follow = () => setTimeout(() => restorePosition(tray), 400)
  Hooks.on('collapseSidebar', follow)
  Hooks.on('renderChatInput', follow)
}

// --- Tray ----------------------------------------------------------------

const createTray = async () => {
  const html = await renderTemplate(
    'systems/wildsea/templates/applications/dice_tray.hbs',
    {
      dice: DIE_ICONS.slice(0, MAX_DICE).map((icon, index) => ({
        count: index + 1,
        icon: `fa-dice-${icon}`,
      })),
      contexts: Object.fromEntries(
        CONTEXTS.map((context) => [
          context,
          `wildsea.TRAY.CONTEXTS.${context}.label`,
        ]),
      ),
    },
  )

  const template = document.createElement('template')
  template.innerHTML = html.trim()
  const tray = template.content.firstElementChild

  tray.addEventListener('click', (event) => {
    const die = event.target.closest('[data-dice]')
    if (die) state.dice = Number(die.dataset.dice)

    const action = event.target.closest('[data-tray-action]')?.dataset
      .trayAction
    if (action === 'cutDown') state.cut = Math.max(state.cut - 1, 0)
    if (action === 'cutUp') state.cut = Math.min(state.cut + 1, MAX_CUT)
    if (action === 'roll') return roll(tray)

    sync(tray)
  })

  // Right-click on a die rolls that many dice straight away.
  tray.addEventListener('contextmenu', (event) => {
    const die = event.target.closest('[data-dice]')
    if (!die || die.disabled) return
    event.preventDefault()
    state.dice = Number(die.dataset.dice)
    roll(tray)
  })

  tray.addEventListener('change', (event) => {
    if (event.target.matches('.tray-context'))
      state.context = event.target.value
    if (event.target.matches('.tray-no-pool'))
      state.noPool = event.target.checked
    sync(tray)
  })

  return tray
}

const mountTray = async () => {
  const tray = await createTray()
  ;(document.getElementById('interface') ?? document.body).append(tray)
  sync(tray)
  restorePosition(tray)
  makeDraggable(tray)
}

export const setup = () => {
  game.settings.register('wildsea', POSITION_SETTING, {
    scope: 'client',
    type: Object,
    default: {},
    config: false,
  })

  CONFIG.wildsea.diceTray = {
    contexts: CONTEXTS,
    maxDice: MAX_DICE,
    maxCut: MAX_CUT,
  }
  game.wildsea.rollTray = rollTray
  Hooks.once('ready', mountTray)
}
