import { WILDSEA } from '../config.js'
import { renderDialog } from '../dialog.js'
import { clamp, clickModifiers, enrich } from '../helpers.js'
import WildseaActorSheet from './actor.js'
import * as Dice from '../dice.js'
import { attack } from '../naval.js'
import { weaponKind } from '../naval_rules.js'

export default class WildseaShipSheet extends WildseaActorSheet {
  get template() {
    return `${WILDSEA.root_path}/templates/sheets/ship.hbs`
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 1000,
      height: 750,
    })
  }

  async getData() {
    const context = await super.getData()
    context.system = this.actor.system

    context.stakesUsed = 0

    for (const item of this.actor.items) {
      item.system.enrichedDetails = await enrich(item.system.details)
      item.system.navalWeapon = !!weaponKind(item)
      if (item.system.stakes)
        context.stakesUsed += parseInt(item.system.stakes) || 0
    }

    context.designs = {}
    for (const designType of WILDSEA.designTypes) {
      context.designs[designType] = this.actor.itemTypes.design.filter(
        (d) => d.system.type === designType,
      )
    }

    context.system.designs = this.actor.itemTypes.design.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    context.system.fittings = this.actor.itemTypes.fitting.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    context.system.undercrew = this.actor.itemTypes.undercrew.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    return context
  }

  activateListeners(html) {
    if (this.isEditable) {
      if (this.actor.isOwner) {
        html.find('.track').click(this.adjustTrack.bind(this, 1))
        html.find('.track').contextmenu(this.adjustTrack.bind(this, -1))

        html.find('.addItem').click(this.addItem.bind(this))
        html.find('.damage-button').click(this.toggleFittingDamaged.bind(this))
      }
      html.find('.ratingRoll').click(this.ratingRoll.bind(this))
      html.find('.navalAttack').click(this.navalAttack.bind(this))
    }
    super.activateListeners(html)
  }

  async adjustTrack(change, event) {
    event.preventDefault()

    const data = event.currentTarget.dataset
    const itemType = data.itemType
    const itemId = data.itemId

    switch (itemType) {
      case 'rating':
        await this.adjustRating(itemId, change, clickModifiers(event))
        break
      case 'reputations':
        await this.adjustSlimTrack(
          itemId,
          itemType,
          clickModifiers(event),
          change,
        )
        break
      default:
        break
    }
  }

  async adjustRating(rating, change = 1, isBurn) {
    const ratingMax = this.actor.system.ratings[rating]?.max || 6
    const marks = this.actor.system.ratings[rating]?.value
    const burns = this.actor.system.ratings[rating]?.burn

    let update = {
      system: {
        ratings: {
          [rating]: {
            value: marks,
            burn: burns,
          },
        },
      },
    }

    if (isBurn) {
      const newBurn = clamp(burns + change, ratingMax)
      update.system.ratings[rating].burn = newBurn
      if (marks <= burns) {
        update.system.ratings[rating].value = newBurn
      }
    } else {
      const newValue = clamp(marks + change, ratingMax, burns)
      update.system.ratings[rating].value = newValue
    }

    this.actor.update({ ...update })
  }

  async addItem(event) {
    event.preventDefault()

    const target = event.currentTarget
    const data = target.dataset

    switch (data.itemType) {
      case 'cargoPassengers':
      case 'conditions':
      case 'reputations':
        this.addSlimItem(data.itemType)
        break
      case 'design':
        this.addDesign(data.itemSubtype)
        break
      case 'fittings':
        this.addFitting()
        break
      case 'undercrew':
        this.addUndercrew()
        break
      default:
        ui.notifications.warn(
          `Type "${data.itemType}" not recognised or not implemented`,
        )
        break
    }
  }

  // Dropped faction journals (flags.wildsea.faction) become reputation tracks
  async _onDrop(event) {
    const editor = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor
    const data = editor.getDragEventData(event)
    if (!['JournalEntry', 'JournalEntryPage'].includes(data.type))
      return super._onDrop(event)

    let doc = await fromUuid(data.uuid)
    if (doc?.documentName === 'JournalEntryPage') doc = doc.parent
    if (!doc?.getFlag('wildsea', 'faction') || !this.actor.isOwner) return false

    const reputations = this.actor.system.reputations || []
    if (reputations.some((r) => r.text === doc.name)) {
      ui.notifications.info(
        game.i18n.format('wildsea.reputationExists', { name: doc.name }),
      )
      return false
    }

    return this.actor.update({
      system: {
        reputations: [
          ...reputations,
          {
            id: foundry.utils.randomID(),
            text: doc.name,
            ...foundry.utils.deepClone(WILDSEA.slimDefaults.reputations),
          },
        ],
      },
    })
  }

  // The ship has no resource list: dropped resources and passengers go to
  // Cargo & Passengers
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false
    const item = await Item.implementation.fromDropData(data)
    const isPassenger =
      item?.type === 'attribute' && item.system.type === 'passenger'
    if (item?.type !== 'resource' && !isPassenger)
      return super._onDropItem(event, data)

    const tags = (item.system.tags || '')
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t && !/^(cargo|carico)$/i.test(t))
    const text = tags.length ? `${item.name} (${tags.join(', ')})` : item.name

    return this.actor.update({
      system: {
        cargoPassengers: [
          ...(this.actor.system.cargoPassengers || []),
          { id: foundry.utils.randomID(), text },
        ],
      },
    })
  }

  async addDesign(subtype) {
    this.addEmbeddedDocument({
      name: game.i18n.format('wildsea.newDesignName', {
        subtype: game.i18n.localize(`wildsea.${subtype}`),
      }),
      type: 'design',
      system: {
        details: game.i18n.localize('wildsea.newDesignDetails'),
        type: subtype,
      },
    })
  }

  async addFitting() {
    this.addEmbeddedDocument({
      name: game.i18n.localize('wildsea.newFittingName'),
      type: 'fitting',
      system: {
        details: game.i18n.localize('wildsea.newFittingDetail'),
      },
    })
  }

  async addUndercrew() {
    this.addEmbeddedDocument({
      name: game.i18n.localize('wildsea.newUndercrewName'),
      type: 'undercrew',
      system: {
        details: game.i18n.localize('wildsea.newUndercrewDetails'),
      },
    })
  }

  async ratingRoll(event) {
    event.preventDefault()
    const rolling = event.currentTarget.dataset.rating

    const ratings = {}
    for (const rating of WILDSEA.shipRatings) {
      const shipRating = this.actor.system.ratings[rating]
      ratings[rating] = clamp(shipRating.max - shipRating.value, shipRating.max)
    }

    const data = await renderDialog(
      game.i18n.localize('wildsea.ratingRoll'),
      this.handleRatingRoll,
      { rating: rolling, ratings },
      '/systems/wildsea/templates/dialogs/rating_roll.hbs',
    )

    if (data.cancelled) return

    const { rating, cut } = data

    const ratingDice = this.actor.system.ratings[rating]

    const dicePool = {
      rating: rolling,
      ratingDice: clamp(ratingDice.max - ratingDice.value, ratingDice.max),
      cut,
    }

    const [roll, outcome] = await Dice.rollPool(dicePool)

    const chatData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker(),
      content: await renderTemplate(
        'systems/wildsea/templates/chat/roll.hbs',
        outcome,
      ),
      roll,
      sound: CONFIG.sounds.dice,
    }
    ChatMessage.create(chatData)
  }

  handleRatingRoll(html) {
    const form = html[0].querySelector('form')
    return {
      rating: form.rating.value,
      cut: parseInt(form.cut.value || 0),
    }
  }

  // Attacks another ship or a raider with an armament, the bite or the
  // crew's own weapons
  async navalAttack(event) {
    event.preventDefault()
    return attack(this.actor, event.currentTarget.dataset.itemId)
  }

  async toggleFittingDamaged(event) {
    const target = event.currentTarget
    const fittingID = target.dataset.fittingId

    const fitting = this.actor.items.get(fittingID)
    const prevStatus = fitting.system.damaged
    fitting.update({ 'system.damaged': !prevStatus })
  }
}
