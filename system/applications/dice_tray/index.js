import { renderTemplate } from '../../helpers.js'
import { CONTEXTS, MAX_CUT, MAX_DICE, rollTray } from './roll.js'

const DIE_ICONS = ['one', 'two', 'three', 'four', 'five', 'six']

// Each client keeps its own tray selection; cut and "no pool" reset after a
// roll because they belong to a single action.
const state = { dice: 1, cut: 0, context: 'action', noPool: false }
let rolling = false

// A single tray follows the chat input around. The promise is cached so
// renders that arrive while the template loads all share the same element.
let trayPromise = null

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

// Foundry fires renderChatInput every time it moves the chat input between
// the sidebar, the popout and the notifications area (including when the
// popout closes), so the tray is re-attached right above the input wherever
// it lands. Chat forms put the controls before the input, the notifications
// area after it, so the tray goes before whichever comes first.
const placeTray = async (_app, elements) => {
  const input = elements['#chat-message']
  if (!input?.parentElement) return

  trayPromise ??= createTray()
  const tray = await trayPromise

  const controls = elements['#chat-controls']
  const controlsFirst =
    controls?.parentElement === input.parentElement &&
    controls.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING
  ;(controlsFirst ? controls : input).before(tray)
  sync(tray)
}

export const setup = () => {
  CONFIG.wildsea.diceTray = {
    contexts: CONTEXTS,
    maxDice: MAX_DICE,
    maxCut: MAX_CUT,
  }
  game.wildsea.rollTray = rollTray
  Hooks.on('renderChatInput', placeTray)
}
