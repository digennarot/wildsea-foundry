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
        this.addSlimItem('aspects')
        break
      case 'drive':
        this.addSlimItem('drives')
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
}
