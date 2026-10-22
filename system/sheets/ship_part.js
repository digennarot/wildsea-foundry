import { WILDSEA } from '../config.js'
import WildseaAspectSheet from './aspect.js'

// A part of a raider's ship or crew, damaged on its own track
// ("Parte della Ciurma, Parte della Nave")
export default class WildseaShipPartSheet extends WildseaAspectSheet {
  get template() {
    return `${WILDSEA.root_path}/templates/sheets/ship_part.hbs`
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      height: 520,
    })
  }

  async getData() {
    const context = await super.getData()

    context.damageTypes = Object.fromEntries(
      WILDSEA.damageTypes.map((type) => [type, `wildsea.DAMAGE.${type}`]),
    )
    context.damageLists = ['resistances', 'weaknesses', 'immunities'].map(
      (key) => ({ key, selected: this.item.system[key] || [] }),
    )

    return context
  }

  // An emptied multiple select is left out of the form data
  _getSubmitData(updateData) {
    const data = super._getSubmitData(updateData)
    for (const key of ['resistances', 'weaknesses', 'immunities'])
      data[`system.${key}`] ??= []
    return data
  }
}
