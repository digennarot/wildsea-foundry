import { mountPanel } from '../../helpers.js'
import { WildseaFocusPanel } from './panel.js'

// The focus holder is a single actor (or nobody), shared by the whole world.
// Only the actor id is stored, so the name always reflects the live actor.
// Players cannot write world settings, so a hijack is whispered to the GMs as
// a request; the active GM validates it, applies it and announces it publicly.
export const getFocus = () => {
  const { actorId } = game.settings.get('wildsea', 'focusHolder')
  const actor = actorId && game.actors.get(actorId)
  return actor ? { actorId, name: actor.name } : {}
}

export const setFocus = async (actor) => {
  try {
    await game.settings.set(
      'wildsea',
      'focusHolder',
      actor ? { actorId: actor.id } : {},
    )
    return true
  } catch (error) {
    console.error('wildsea | Could not update the focus holder', error)
    ui.notifications.error(game.i18n.localize('wildsea.FOCUS.updateFailed'))
    return false
  }
}

const focusMessage = (key, actor, data = {}) =>
  ChatMessage.create({
    content: `<p>${game.i18n.format(key, {
      name: Handlebars.escapeExpression(actor.name),
    })}</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    ...data,
  })

export const giveFocus = async (actor) => {
  if (await setFocus(actor)) focusMessage('wildsea.FOCUS.given', actor)
}

export const hijackFocus = (actor) => {
  // Only an active GM can apply the hijack, so without one nothing would change.
  if (!game.users.activeGM) {
    ui.notifications.warn(game.i18n.localize('wildsea.FOCUS.noGM'))
    return
  }

  focusMessage('wildsea.FOCUS.requested', actor, {
    whisper: ChatMessage.getWhisperRecipients('GM').map((user) => user.id),
    flags: { wildsea: { focusRequest: { actorId: actor.id } } },
  })
}

const applyHijack = async (message) => {
  const request = message.getFlag('wildsea', 'focusRequest')
  if (!request || !game.users.activeGM?.isSelf) return

  const actor = game.actors.get(request.actorId)
  const allowed =
    actor &&
    message.author &&
    actor.testUserPermission(message.author, 'OWNER')

  const applied = allowed && (await setFocus(actor))
  if (applied) await focusMessage('wildsea.FOCUS.hijacked', actor)
  else if (message.author) {
    // Tell the requesting player privately that nothing changed.
    await ChatMessage.create({
      content: `<p>${game.i18n.localize('wildsea.FOCUS.rejected')}</p>`,
      whisper: [message.author.id],
    })
  }

  await message.delete()
}

const refreshPanel = () => game.wildsea.focusPanel.render(true)

export const setup = () => {
  game.settings.register('wildsea', 'focusHolder', {
    scope: 'world',
    type: Object,
    default: {},
    config: false,
    onChange: refreshPanel,
  })

  game.wildsea.focusPanel = new WildseaFocusPanel()
  mountPanel('wildsea-focus-panel', () => game.wildsea.focusPanel)

  Hooks.on('createChatMessage', applyHijack)

  // Hijack buttons depend on whether a GM is connected.
  Hooks.on('userConnected', refreshPanel)

  // Keep the panel's buttons and holder name in sync with the actors.
  Hooks.on('createActor', (actor) => {
    if (actor.type === 'player') refreshPanel()
  })

  Hooks.on('updateActor', (actor, changes) => {
    if (actor.type !== 'player') return
    if ('name' in changes || 'ownership' in changes) refreshPanel()
  })

  Hooks.on('deleteActor', (actor) => {
    if (actor.type !== 'player') return
    refreshPanel()

    if (!game.users.activeGM?.isSelf) return
    const { actorId } = game.settings.get('wildsea', 'focusHolder')
    if (actorId === actor.id) setFocus(null)
  })
}
