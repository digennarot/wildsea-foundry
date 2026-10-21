import { isDesperate, readPool } from '../../dice.js'
import { clamp, renderTemplate } from '../../helpers.js'

// Roll types that have their own results table in the rulebook.
export const CONTEXTS = [
  'action',
  'attack',
  'defense',
  'resources',
  'rest',
  'crafting',
  'rating',
]

export const MAX_DICE = 6
export const MAX_CUT = 5

export const rollTray = async ({
  dice = 1,
  cut = 0,
  context = 'action',
  noPool = false,
} = {}) => {
  dice = clamp(Math.trunc(Number(dice)) || 1, MAX_DICE, 1)
  cut = clamp(Math.trunc(Number(cut)) || 0, MAX_CUT)
  if (!CONTEXTS.includes(context)) context = 'action'

  const desperate = noPool || isDesperate(dice, cut)
  const count = desperate ? 1 : dice
  const appliedCut = desperate ? 0 : cut

  const roll = await new Roll(`${count}d6`).evaluate()
  const rolled = roll.dice[0].results.map((result) => result.result)
  const { cutIndexes, twist, topIndex, outcome } = readPool(
    rolled,
    appliedCut,
    { desperate },
  )

  const i18n = game.i18n
  const key = `wildsea.TRAY.CONTEXTS.${context}`
  const notes = []
  if (appliedCut) notes.push(i18n.format('wildsea.TRAY.cutNote', { cut }))
  if (desperate) {
    notes.push(
      noPool
        ? i18n.localize('wildsea.TRAY.noPool')
        : i18n.format('wildsea.TRAY.allCut', { cut }),
    )
    notes.push(i18n.localize('wildsea.TRAY.downgraded'))
  }

  const content = await renderTemplate(
    'systems/wildsea/templates/chat/tray_roll.hbs',
    {
      title: i18n.localize(`${key}.title`),
      formula: `${count}d6`,
      dice: rolled.map((value, index) => ({
        value,
        cut: cutIndexes.has(index),
        top: index === topIndex,
      })),
      notes: notes.join(' · '),
      outcome,
      outcomeText: i18n.localize(`${key}.${outcome}`),
      twist,
      twistText: i18n.localize(`${key}.twist`),
    },
  )

  // Attaching the Roll lets Dice So Nice! animate the real results and
  // applies the message mode selected in the chat controls.
  return roll.toMessage({ speaker: ChatMessage.getSpeaker(), content })
}
