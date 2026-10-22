import { WILDSEA } from '../config.js'
import { enrich } from '../helpers.js'
import { damageShip } from '../naval.js'
import { damageTracks, isDisabled } from '../naval_rules.js'
import WildseaActorSheet from './actor.js'
import WildseaAdversarySheet from './adversary.js'
import WildseaShipSheet from './ship.js'

// A raider ship (rulebook ch.10, "Navi Predoniche"): an active hazard with
// the ratings of a ship, its armaments, and the drives, aspects and quirks of
// a hazard. Its damage goes on its ratings or on tracks for its parts.
export default class WildseaRaiderSheet extends WildseaShipSheet {
  get template() {
    return `${WILDSEA.root_path}/templates/sheets/raider.hbs`
  }

  async getData() {
    const context = await super.getData()

    context.system.enrichedDetails = await enrich(this.actor.system.description)

    const attributes = this.actor.itemTypes.attribute
    context.aspects = attributes.filter((a) => a.system.type === 'aspect')
    context.drives = attributes.filter((a) => a.system.type === 'drive')
    context.quirks = attributes.filter((a) => a.system.type === 'quirk')
    context.system.resources = this.actor.itemTypes.resource.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    context.parts = this.actor.itemTypes.shipPart.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    const tracks = damageTracks(this.actor)
    context.boxes = tracks.reduce((sum, t) => sum + t.track.max, 0)
    context.disabled = isDisabled(tracks)

    return context
  }

  // A raider strikes the crew's ship: the Firefly picks the rating and damage
  async navalAttack(event) {
    event.preventDefault()
    return damageShip(this.actor, {
      itemId: event.currentTarget.dataset.itemId,
    })
  }

  async addItem(event) {
    const itemType = event.currentTarget.dataset.itemType

    switch (itemType) {
      case 'aspect':
      case 'drive':
      case 'quirk':
        event.preventDefault()
        return WildseaAdversarySheet.prototype.addAttribute.call(this, itemType)
      case 'resource':
        event.preventDefault()
        return WildseaAdversarySheet.prototype.addResource.call(this)
      case 'shipPart':
        event.preventDefault()
        return this.addEmbeddedDocument({
          name: game.i18n.localize('wildsea.NAVAL.newPartName'),
          type: 'shipPart',
          system: {
            details: game.i18n.localize('wildsea.NAVAL.newPartDetails'),
          },
        })
      default:
        return super.addItem(event)
    }
  }

  // Dropped items are embedded as on a hazard: a raider has no cargo list
  // and no reputations
  async _onDrop(event) {
    return WildseaActorSheet.prototype._onDrop.call(this, event)
  }

  async _onDropItem(event, data) {
    return WildseaActorSheet.prototype._onDropItem.call(this, event, data)
  }
}
