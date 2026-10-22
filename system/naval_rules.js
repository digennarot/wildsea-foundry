import { WILDSEA } from './config.js'
import { clamp } from './helpers.js'

// Rules of naval battles, kept free of Foundry documents so they can be
// tested on their own. Rulebook: ch.10 "Battaglia Navale", impact p.43,
// hazard tracks p.220, armaments p.177.

const IMPACT_STEPS = ['none', ...WILDSEA.impacts]

// Ships and leviathans take total impact as normal impact. A raider tracked
// on its ratings ignores anything weaker; a raider tracked on its parts takes
// one step less impact from anything weaker than a ship armament
export const effectiveImpact = (
  impact,
  { mode = 'equal', shipScale = true } = {},
) => {
  if (impact === 'total') return 'normal'
  if (mode === 'equal') return 'none'
  if (shipScale) return impact
  return IMPACT_STEPS[Math.max(0, IMPACT_STEPS.indexOf(impact) - 1)]
}

// A hit marks one box and increased impact one more; resistances and
// weaknesses alter the damage hazards take by one box only
export const marksFor = (impact, damageType = '', part = null) => {
  if (impact === 'none') return 0

  const has = (list) => !!damageType && (list || []).includes(damageType)
  if (part && has(part.immunities)) return 0

  let marks = { limited: 0, normal: 1, increased: 2 }[impact] ?? 0
  if (part && has(part.weaknesses)) marks += 1
  if (part && has(part.resistances)) marks -= 1
  return Math.max(0, marks)
}

// Marks (or burns) boxes the same way the sheets do when a track is clicked
export const markTrack = ({ value = 0, burn = 0, max = 0 }, marks, isBurn) => {
  if (isBurn) {
    const newBurn = clamp(burn + marks, max)
    return { value: Math.max(value, newBurn), burn: newBurn }
  }
  return { value: clamp(value + marks, max, burn), burn }
}

const plainText = (html) => (html || '').replace(/<[^>]*>/g, ' ')

// The damage type named first in a text, as in "Deals massive LR Keen damage"
export const detectDamageType = (html) => {
  const text = plainText(html)
  let found = ''
  let foundAt = Infinity
  for (const [type, pattern] of Object.entries(WILDSEA.damageTypePatterns)) {
    const index = text.search(pattern)
    if (index >= 0 && index < foundAt) {
      found = type
      foundAt = index
    }
  }
  return found
}

// Armaments are fittings; a bite that deals damage can ram
export const weaponKind = (item) => {
  const details = plainText(item.system?.details)
  if (item.type === 'design')
    return item.system.type === 'bite' && WILDSEA.damagePattern.test(details)
      ? 'ram'
      : null
  if (item.type !== 'fitting') return null
  if (
    WILDSEA.armamentTypePattern.test(item.system.type || '') ||
    WILDSEA.damagePattern.test(details)
  )
    return 'armament'
  return null
}

export const hasSafeRam = (items) =>
  items.some((item) =>
    WILDSEA.safeRamPattern.test(plainText(item.system?.details)),
  )

export const isFull = (track) => track.max > 0 && track.value >= track.max

// Every track the attacks of a naval battle can mark on a ship or raider
export const damageTracks = (actor, ratings = WILDSEA.shipRatings) => {
  const mode = actor.type === 'raider' ? actor.system.damageMode : 'equal'

  if (mode === 'parts')
    return actor.items
      .filter((item) => item.type === 'shipPart')
      .sort((a, b) => (a.sort < b.sort ? -1 : 1))
      .map((item) => ({
        id: item.id,
        kind: 'part',
        label: item.name,
        track: item.system.track,
        part: item.system,
      }))
      .filter((t) => t.track.max > 0)

  return ratings
    .map((rating) => ({
      id: rating,
      kind: 'rating',
      label: `wildsea.${rating}`,
      track: actor.system.ratings[rating],
      part: null,
    }))
    .filter((t) => t.track?.max > 0)
}

// A raider is neutralised (or destroyed) once all of its tracks are marked
export const isDisabled = (tracks) =>
  tracks.length > 0 && tracks.every((t) => isFull(t.track))
