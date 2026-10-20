import { getFocus, giveFocus, hijackFocus, setFocus } from './index.js'

export class WildseaFocusPanel extends Application {
  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: 'wildsea-focus-panel',
      popOut: false,
      template: 'systems/wildsea/templates/applications/focus/panel.hbs',
    }
  }

  async getData(options) {
    const data = await super.getData(options)
    const isGM = game.user.isGM
    const holder = getFocus()
    // Players can only hijack while a GM is connected to apply the request.
    const canAct = isGM || Boolean(game.users.activeGM)
    const actions = []
    for (const actor of canAct ? game.actors : []) {
      if (actor.type !== 'player' || actor.id === holder.actorId) continue
      if (isGM || actor.isOwner)
        actions.push({ id: actor.id, name: actor.name })
    }

    return { ...data, holder, isGM, actions }
  }

  activateListeners(html) {
    html.find('.focus-action').click((event) => {
      event.preventDefault()
      const actor = game.actors.get(event.currentTarget.dataset.actorId)
      if (!actor) return

      if (game.user.isGM) giveFocus(actor)
      else hijackFocus(actor)
    })

    html.find('.clear-focus').click((event) => {
      event.preventDefault()
      setFocus(null)
    })
  }
}
