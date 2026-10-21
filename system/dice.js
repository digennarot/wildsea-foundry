export const addDiceColor = (
  dice3d,
  name,
  description,
  color,
  text = '#f9f9f9',
  outline = '#2d2a2b',
) => {
  const commonDice = {
    category: 'Wildsea',
    foreground: text,
    visibility: 'visible',
    font: 'Teko',
    material: 'wood',
    texture: 'wood',
  }

  dice3d.addColorset(
    {
      ...commonDice,
      name,
      description,
      background: color,
      edge: color,
      outline,
    },
    'default',
  )
}

// A cut that removes every die (or a pool with nothing to draw on) means
// rolling a single die, with a triumph counting as a conflict.
export const isDesperate = (dice, cut) => dice - cut <= 0

// Reads a rolled pool: drops the `cut` highest results, then takes the
// highest die left; doubles among the kept dice are a twist.
export const readPool = (rolled, cut, { desperate = false } = {}) => {
  const byValue = rolled
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value)
  const cutIndexes = new Set(byValue.slice(0, cut).map((die) => die.index))
  const kept = rolled.filter((_value, index) => !cutIndexes.has(index))

  const highest = Math.max(...kept)
  const twist = new Set(kept).size < kept.length
  const topIndex = rolled.findIndex(
    (value, index) => value === highest && !cutIndexes.has(index),
  )

  let outcome = 'disaster'
  if (highest === 6) outcome = desperate ? 'conflict' : 'triumph'
  else if (highest >= 4) outcome = 'conflict'

  return { cutIndexes, highest, twist, topIndex, outcome }
}

export const rollPool = async (dicePool) => {
  const totalDice =
    (dicePool.edgeDice || 0) +
    (dicePool.skillDice || 0) +
    (dicePool.advantageDice || 0) +
    (dicePool.ratingDice || 0)

  dicePool.cut = parseInt(dicePool.cut) || 0

  const zeroDice = isDesperate(totalDice, dicePool.cut)
  const cut = zeroDice ? 0 : dicePool.cut

  let formula = zeroDice ? '1d6' : `${totalDice}d6`
  if (cut > 0) formula += `dh${cut}`
  formula += 'kh'

  const roll = await new Roll(formula).evaluate()

  const rolled = roll.dice[0].results.map((r) => r.result)
  const { cutIndexes, highest, twist, topIndex, outcome } = readPool(
    rolled,
    cut,
    { desperate: zeroDice },
  )

  const results = rolled
    .map((result, index) => ({
      result,
      cut: cutIndexes.has(index),
      max: index === topIndex,
    }))
    .sort((a, b) => a.result - b.result)

  let displayFormula = `${totalDice}d`
  if (dicePool.cut > 0)
    displayFormula += ` ${game.i18n.localize('wildsea.cut')} ${dicePool.cut}`

  return [
    roll,
    {
      dicePool,
      results,
      twist,
      total: highest,
      displayFormula,
      resultText: outcome,
    },
  ]
}
