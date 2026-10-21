import { WILDSEA } from '../config.js'
import { renderDialog } from '../dialog.js'
import WildseaAdversarySheet from './adversary.js'

const hasVowel = (syllable) => /[aeiouy]/i.test(syllable)
const pick = (list) => list[Math.floor(Math.random() * list.length)]

// Chain one to four name elements of a language, as the rulebook appendix
// suggests; elements without vowels (Ns, K...) never start a name, and no
// element follows itself
const generateWord = (syllables, maxParts = 4) => {
  const count = Math.min(pick([1, 2, 2, 2, 3, 3, 3, 4]), maxParts)
  const parts = [pick(syllables.filter(hasVowel))]
  while (parts.length < count)
    parts.push(pick(syllables.filter((s) => s !== parts.at(-1))))

  const word = parts.join('').toLowerCase()
  return word.charAt(0).toUpperCase() + word.slice(1)
}

export const generateName = (language) => {
  const syllables = WILDSEA.nameSyllables[language]
  // Cthonic elements are whole words, so two are already a long name
  const name = generateWord(syllables, language === 'cthonic' ? 2 : 4)

  // Gaudimm names often come with a second name
  if (language === 'gaudimm' && Math.random() < 0.5)
    return `${name} ${generateWord(syllables)}`
  return name
}

export default class WildseaNpcSheet extends WildseaAdversarySheet {
  get template() {
    return `${WILDSEA.root_path}/templates/sheets/npc.hbs`
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      width: 850,
      height: 750,
    })
  }

  async getData() {
    const context = await super.getData()

    context.aspects = this.actor.itemTypes.aspect.sort((a, b) =>
      a.sort < b.sort ? -1 : 1,
    )

    context.temporaryTracks = this.actor.itemTypes.temporaryTrack.sort(
      (a, b) => (a.sort < b.sort ? -1 : 1),
    )

    return context
  }

  activateListeners(html) {
    if (this.isEditable && this.actor.isOwner)
      html.find('.generateName').click(this.promptName.bind(this))

    super.activateListeners(html)
  }

  async addItem(event) {
    const itemType = event.currentTarget.dataset.itemType

    switch (itemType) {
      case 'aspect':
        event.preventDefault()
        this.addEmbeddedDocument({
          name: game.i18n.localize('wildsea.newAspectName'),
          type: 'aspect',
          system: { details: game.i18n.localize('wildsea.newAspectDetails') },
        })
        break
      case 'temporaryTrack':
        event.preventDefault()
        this.addEmbeddedDocument({
          name: game.i18n.localize('wildsea.newTemporaryTrackName'),
          type: 'temporaryTrack',
          system: {
            details: game.i18n.localize('wildsea.newTemporaryTrackDetails'),
          },
        })
        break
      default:
        return super.addItem(event)
    }
  }

  async promptName(event) {
    event.preventDefault()

    const data = await renderDialog(
      game.i18n.localize('wildsea.generateName'),
      (html) => ({
        language: html[0].querySelector('form').language.value,
      }),
      {
        languages: Object.keys(WILDSEA.nameSyllables),
        language: this._nameLanguage ?? 'lowSour',
      },
      `${WILDSEA.root_path}/templates/dialogs/npc_name.hbs`,
    )

    if (data.cancelled) return

    // remember the language, so the button can be clicked again for a new name
    this._nameLanguage = data.language
    return this.actor.update({ name: generateName(data.language) })
  }

  // Factions fill in the Faction field
  async _onDrop(event) {
    const editor =
      foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor
    const data = editor.getDragEventData(event)
    if (!['JournalEntry', 'JournalEntryPage'].includes(data.type))
      return super._onDrop(event)

    let doc = await fromUuid(data.uuid)
    if (doc?.documentName === 'JournalEntryPage') doc = doc.parent
    if (!doc?.getFlag('wildsea', 'faction') || !this.actor.isOwner) return false

    return this.actor.update({ 'system.faction': doc.name })
  }

  // Bloodlines and posts fill in the profile fields; drives are embedded as
  // usual, and other attributes are refused as the sheet cannot show them
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return false
    const item = await Item.implementation.fromDropData(data)
    if (item?.type !== 'attribute') return super._onDropItem(event, data)

    const field = WILDSEA.npcDropFields[item.system.type]
    if (field) {
      await this.actor.update({ [`system.${field}`]: item.name })
      ui.notifications.info(
        game.i18n.format('wildsea.backgroundSet', {
          field: game.i18n.localize(`wildsea.${field}`),
          name: item.name,
        }),
      )
      return false
    }

    if (item.system.type === 'drive')
      return super._onDropItem(event, data)

    ui.notifications.warn(
      game.i18n.format('wildsea.npcDropUnsupported', { name: item.name }),
    )
    return false
  }
}
