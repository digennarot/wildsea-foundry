import { WILDSEA } from './config.js'
import { clamp, renderTemplate } from './helpers.js'
import { renderDialog } from './dialog.js'
import * as Dice from './dice.js'
import {
  damageTracks,
  detectDamageType,
  effectiveImpact,
  hasSafeRam,
  isDisabled,
  isFull,
  markTrack,
  marksFor,
  weaponKind,
} from './naval_rules.js'

// Naval battles: ships attack raiders with their armaments and bites, the
// Firefly applies the damage from the chat card, raiders strike back at the
// crew's ship from their own sheet

const TEMPLATES = `${WILDSEA.root_path}/templates`
const FLAG = 'navalAttack'

const localize = (key) => game.i18n.localize(key)

const damageTypeOptions = () =>
  Object.fromEntries(
    WILDSEA.damageTypes.map((type) => [type, `wildsea.DAMAGE.${type}`]),
  )

const impactOptions = () =>
  Object.fromEntries(
    WILDSEA.impacts.map((impact) => [impact, `wildsea.NAVAL.impact.${impact}`]),
  )

const ratingDice = (actor) =>
  Object.fromEntries(
    WILDSEA.shipRatings.map((rating) => {
      const { max, value } = actor.system.ratings[rating]
      return [rating, clamp(max - value, max)]
    }),
  )

// Ships and raiders that can be attacked: targeted tokens first, then the
// tokens of the scene, then world actors that have no token on it
export const navalTargets = (attacker, types = ['raider', 'ship']) => {
  const sceneTokens = canvas?.scene?.tokens ?? []
  const onScene = new Set(sceneTokens.map((t) => t.actorId))
  const targeted = new Set(
    [...(game.user.targets ?? [])].map((t) => t.actor?.uuid),
  )

  const candidates = [
    ...[...(game.user.targets ?? [])].map((t) => t.actor),
    ...sceneTokens.map((t) => t.actor),
    ...game.actors.filter((a) => !onScene.has(a.id)),
  ]

  const seen = new Set()
  return candidates
    .filter((actor) => {
      if (!actor || !types.includes(actor.type)) return false
      if (actor.uuid === attacker?.uuid || seen.has(actor.uuid)) return false
      seen.add(actor.uuid)
      return true
    })
    .map((actor) => ({
      uuid: actor.uuid,
      name: actor.token?.name ?? actor.name,
      targeted: targeted.has(actor.uuid),
    }))
}

const postCard = async (template, data, speakerActor, flags = {}) =>
  ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor: speakerActor }),
    content: await renderTemplate(`${TEMPLATES}/chat/${template}`, data),
    flags: { wildsea: flags },
  })

const rollRating = async (actor, rating, cut) => {
  const dice = ratingDice(actor)[rating]
  const [roll, outcome] = await Dice.rollPool({
    rating,
    ratingDice: dice,
    cut,
  })

  await ChatMessage.create({
    user: game.user.id,
    speaker: ChatMessage.getSpeaker({ actor }),
    content: await renderTemplate(`${TEMPLATES}/chat/roll.hbs`, outcome),
    rolls: [roll],
    sound: CONFIG.sounds.dice,
  })
  return outcome
}

// An attack from the crew's ship (or a raider) against another ship: armaments
// and rams have total impact, the crew's own weapons normal impact
export const attack = async (attacker, itemId = null) => {
  const targets = navalTargets(attacker)
  if (!targets.length)
    return ui.notifications.warn(localize('wildsea.NAVAL.noTargets'))

  const weapons = attacker.items
    .filter((item) => weaponKind(item))
    .map((item) => ({
      id: item.id,
      name: item.name,
      kind: weaponKind(item),
    }))
  const selected = attacker.items.get(itemId)

  const data = await renderDialog(
    localize('wildsea.NAVAL.attack'),
    (html) => {
      const form = html[0].querySelector('form')
      return {
        target: form.target.value,
        weapon: form.weapon.value,
        damageType: form.damageType.value,
        impact: form.impact.value,
        rating: form.rating.value,
        cut: parseInt(form.cut.value || 0),
      }
    },
    {
      targets,
      weapons,
      weapon: selected?.id ?? weapons[0]?.id ?? '',
      damageTypes: damageTypeOptions(),
      impacts: impactOptions(),
      ratings: ratingDice(attacker),
      rating: selected && weaponKind(selected) === 'ram' ? 'saws' : '',
    },
    `${TEMPLATES}/dialogs/naval_attack.hbs`,
  )
  if (data.cancelled) return

  const target = await fromUuid(data.target)
  if (!target) return

  const item = attacker.items.get(data.weapon)
  const kind = item ? weaponKind(item) : 'crew'
  const damageType =
    data.damageType || (item ? detectDamageType(item.system.details) : '')
  const impact = data.impact || (kind === 'crew' ? 'normal' : 'total')

  let outcome = null
  let twist = false
  if (data.rating) {
    const result = await rollRating(attacker, data.rating, data.cut)
    outcome = result.resultText
    twist = result.twist
  }

  const flags = {
    attackerUuid: attacker.uuid,
    targetUuid: target.uuid,
    weapon: item?.name ?? localize('wildsea.NAVAL.crewWeapon'),
    kind,
    damageType,
    impact,
    shipScale: kind !== 'crew',
    outcome,
    selfDamage: kind === 'ram' && !hasSafeRam(attacker.items),
    applied: false,
  }

  return postCard(
    'naval_attack.hbs',
    {
      ...flags,
      attacker: attacker.token?.name ?? attacker.name,
      target: target.token?.name ?? target.name,
      twist,
      miss: outcome === 'disaster',
      damageLabel: damageType ? `wildsea.DAMAGE.${damageType}` : null,
    },
    attacker,
    { [FLAG]: flags },
  )
}

const partNotes = (part) => {
  if (!part) return ''
  const list = (key, types) =>
    types?.length
      ? `${localize(`wildsea.NAVAL.${key}`)}: ${types
          .map((t) => localize(`wildsea.DAMAGE.${t}`))
          .join(', ')}`
      : null
  return [
    list('resistances', part.resistances),
    list('weaknesses', part.weaknesses),
    list('immunities', part.immunities),
  ]
    .filter(Boolean)
    .join(' · ')
}

const markTarget = async (target, entry, marks, burn) => {
  const result = markTrack(entry.track, marks, burn)
  if (entry.kind === 'rating')
    await target.update({
      [`system.ratings.${entry.id}.value`]: result.value,
      [`system.ratings.${entry.id}.burn`]: result.burn,
    })
  else
    await target.items.get(entry.id).update({
      'system.track.value': result.value,
      'system.track.burn': result.burn,
    })
  return { ...entry.track, ...result }
}

const reportDamage = async (target, entry, marks, burn, extra = {}) => {
  const track = await markTarget(target, entry, marks, burn)
  const tracks = damageTracks(target)

  return postCard(
    'naval_damage.hbs',
    {
      target: target.token?.name ?? target.name,
      track: entry.kind === 'rating' ? localize(entry.label) : entry.label,
      marks,
      burn,
      full: isFull(track),
      disabled: target.type === 'raider' && isDisabled(tracks),
      ...extra,
    },
    target,
  )
}

// The Firefly applies the damage of an attack card to one of the target's tracks
export const applyAttack = async (message) => {
  const flags = message.getFlag('wildsea', FLAG)
  if (!flags || !game.user.isGM) return

  const target = await fromUuid(flags.targetUuid)
  if (!target)
    return ui.notifications.warn(localize('wildsea.NAVAL.targetMissing'))

  const mode = target.type === 'raider' ? target.system.damageMode : 'equal'
  const impact = effectiveImpact(flags.impact, {
    mode,
    shipScale: flags.shipScale,
  })

  const tracks = damageTracks(target).map((entry) => ({
    ...entry,
    name: entry.kind === 'rating' ? localize(entry.label) : entry.label,
    marks: marksFor(impact, flags.damageType, entry.part),
    full: isFull(entry.track),
    notes: partNotes(entry.part),
  }))
  if (!tracks.length)
    return ui.notifications.warn(localize('wildsea.NAVAL.noTracks'))

  const best = tracks
    .filter((t) => !t.full)
    .sort((a, b) => b.marks - a.marks)[0]

  const data = await renderDialog(
    game.i18n.format('wildsea.NAVAL.applyTitle', {
      target: target.token?.name ?? target.name,
    }),
    (html) => {
      const form = html[0].querySelector('form')
      return {
        track: form.querySelector('input[name="track"]:checked')?.value,
        marks: form.marks.value,
        burn: form.burn.checked,
      }
    },
    {
      tracks,
      selected: (best ?? tracks[0]).id,
      impact: `wildsea.NAVAL.impact.${impact}`,
      ignored: impact === 'none',
      mode: WILDSEA.raiderDamageModes[mode],
    },
    `${TEMPLATES}/dialogs/naval_apply.hbs`,
  )
  if (data.cancelled || !data.track) return

  const entry = tracks.find((t) => t.id === data.track)
  const marks =
    data.marks === '' ? entry.marks : Math.max(0, parseInt(data.marks) || 0)

  await reportDamage(target, entry, marks, data.burn, {
    weapon: flags.weapon,
    impact: `wildsea.NAVAL.impact.${impact}`,
  })
  return message.setFlag('wildsea', FLAG, { ...flags, applied: true })
}

// Damage to a ship's rating: a raider's attack, or the crew's own ship
// hurt by ramming. Light 1-2 boxes, medium 3-4, heavy 5-6 (p.220)
export const damageShip = async (
  source,
  { target = null, itemId = null, rating = 'armour' } = {},
) => {
  const targets = target
    ? [{ uuid: target.uuid, name: target.token?.name ?? target.name }]
    : navalTargets(source, ['ship', 'raider'])
  if (!targets.length)
    return ui.notifications.warn(localize('wildsea.NAVAL.noTargets'))

  const weapons = source.items
    .filter((item) => weaponKind(item))
    .map((item) => ({ id: item.id, name: item.name }))

  const data = await renderDialog(
    localize('wildsea.NAVAL.damageShip'),
    (html) => {
      const form = html[0].querySelector('form')
      return {
        target: form.target.value,
        rating: form.rating.value,
        marks: Math.max(0, parseInt(form.marks.value) || 0),
        burn: form.burn.checked,
        weapon: form.weapon?.value,
      }
    },
    {
      targets,
      ratings: WILDSEA.shipRatings,
      rating,
      weapons,
      weapon: itemId ?? '',
      marks: 2,
    },
    `${TEMPLATES}/dialogs/naval_damage_ship.hbs`,
  )
  if (data.cancelled) return

  const ship = await fromUuid(data.target)
  if (!ship) return
  if (!ship.isOwner)
    return ui.notifications.warn(localize('wildsea.NAVAL.notOwner'))

  const entry = damageTracks(ship).find(
    (t) => t.kind === 'rating' && t.id === data.rating,
  ) ?? {
    id: data.rating,
    kind: 'rating',
    label: `wildsea.${data.rating}`,
    track: ship.system.ratings[data.rating],
  }
  const item = source.items.get(data.weapon)
  const damageType = item ? detectDamageType(item.system.details) : ''

  return reportDamage(ship, entry, data.marks, data.burn, {
    weapon: item?.name,
    damageLabel: damageType ? `wildsea.DAMAGE.${damageType}` : null,
  })
}

const onCardAction = async (message, action) => {
  const flags = message.getFlag('wildsea', FLAG)
  if (!flags) return

  if (action === 'navalApply') return applyAttack(message)
  if (action === 'navalSelfDamage') {
    const attacker = await fromUuid(flags.attackerUuid)
    if (attacker)
      return damageShip(attacker, { target: attacker, rating: 'saws' })
  }
}

export const setupNaval = () => {
  Hooks.on('renderChatMessageHTML', (message, html) => {
    const flags = message.getFlag('wildsea', FLAG)
    if (!flags) return

    // only the Firefly applies damage
    for (const button of html.querySelectorAll('.gm-only'))
      if (!game.user.isGM) button.remove()

    if (flags.applied)
      for (const button of html.querySelectorAll(
        '[data-naval-action="navalApply"]',
      ))
        button.classList.add('applied')

    for (const button of html.querySelectorAll('[data-naval-action]'))
      button.addEventListener('click', (event) => {
        event.preventDefault()
        onCardAction(message, button.dataset.navalAction)
      })
  })
}
