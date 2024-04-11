import { WILDSEA } from '../config.js'
import { enrich, clamp } from '../helpers.js'
import WildseaActorSheet from './actor.js'

export default class WildseaAdversarySheet extends WildseaActorSheet {

  get template() {
    return `${WILDSEA.root_path}/templates/sheets/adversary.hbs`
  }

  async getData() {
    const context = await super.getData()
    context.system = this.actor.system

    for (const item of this.actor.items) {
      item.system.enrichedDetails = await enrich(item.system.details)
    }

    context.aspects = []
    context.drives = []
    
    for (const attribute of this.actor.itemTypes.attribute) {
      if(attribute.system.type === "aspect") {
        context.aspects.push(attribute)
      }
    }

    for (const attribute of this.actor.itemTypes.attribute) {
      if(attribute.system.type === "drive") {
        context.drives.push(attribute)
      }
    }

    console.log(context.aspects)
    return context
  }
  
  activateListeners(html) {
    // Add item
    html.find('.addItem').click(this.addItem.bind(this))

    super.activateListeners(html)
  }

  async addItem(event) {
    event.preventDefault()

    const target = event.currentTarget
    const data = target.dataset

    switch (data.itemType) {
      case 'aspect':
        this.addAttribute('aspect')
        break
      case 'drive':
        this.addAttribute('drive')
        break
      case 'resource':
        this.addResource()
        break
      default:
        ui.notifications.warn(
          `Type "${data.itemType}" not recognised or not implemented`,
        )
        break
    }
  }

  async addAttribute(attributeType) {
    const defaultData = {}

    const itemData = {
      name: game.i18n.localize('wildsea.newAttributeName'),
      type: 'attribute',
      data: {
        details: game.i18n.localize('wildsea.newAttributeDetails'),
        type: attributeType,
        ...defaultData,
      }
    }

    this.addEmbeddedDocument(itemData)
  }
}
