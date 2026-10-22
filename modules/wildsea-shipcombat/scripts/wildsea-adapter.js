/**
 * WildseaAdapter – The Wildsea implementation of causodes-shipcombat-core's
 * SystemAdapter.
 *
 * Wildsea rolls pools of d6 (edge + skill + advantage, minus cut) and reads
 * the highest die: 6 is a triumph, 4-5 a conflict, 1-3 a disaster. The engine
 * thinks in success levels (SL), so a roll becomes:
 *
 *   disaster  → SL −3 … −1  (highest die − 4)
 *   conflict  → SL 1        (success at a cost)
 *   triumph   → SL 1 + every 6 kept (2 or more)
 *
 * Single shots of a salvo roll 1d6 plus the accuracy modifier against a
 * target of 4 (a conflict); a natural 6 always hits and is critical, a
 * natural 1 always misses. Full hit resolution rolls a Wildsea pool with one
 * die per point of modifier.
 *
 * Core APIs come from globalThis.ShipCombat._api, never from ES imports.
 */

const { SystemAdapter } = globalThis.ShipCombat._api
export const MODULE_ID = 'wildsea-shipcombat'

const HIT_TARGET = 4

// Abstract role skills → Wildsea skill and edge. The engine stores a role
// skill as "skillKey|specialisation": the skill comes first, the edge second.
const SKILL_MAP = {
  leadership: { key: 'sway', edge: 'iron' },
  engineering: { key: 'study', edge: 'sharps' },
  pilot: { key: 'wavewalk', edge: 'tides' },
  sensors: { key: 'sense', edge: 'instinct' },
  gunner: { key: 'hunt', edge: 'sharps' },
  ordnance: { key: 'break', edge: 'iron' },
  navigation: { key: 'study', edge: 'tides' },
}

const ROLE_SKILLS = {
  captain: 'leadership',
  engineer: 'engineering',
  pilot: 'pilot',
  sensors: 'sensors',
  gunner: 'gunner',
  ordnance: 'ordnance',
}

const wildseaLabel = (key) => game.i18n.localize(`wildsea.${key}`)

// The engine shows the specialisation as it is, so edges are stored by their
// label; keys (and labels of another language) are recognised too
const edgeKey = (specialisation) =>
  CONFIG.wildsea.edges.find(
    (edge) => edge === specialisation || wildseaLabel(edge) === specialisation,
  ) ?? null

// The die a single-die roll shows (the kept one for pools)
const naturalDie = (roll) => {
  const results = roll?.dice?.[0]?.results ?? []
  return (results.find((r) => r.active !== false) ?? results[0])?.result ?? 0
}

// Success level of a Wildsea pool read by the system's dice helpers
export const poolSuccessLevel = ({ resultText, total, results = [] }) => {
  if (resultText === 'triumph')
    return 1 + results.filter((r) => !r.cut && r.result === 6).length
  if (resultText === 'conflict') return 1
  return Math.min(-1, (total || 1) - HIT_TARGET)
}

export class WildseaAdapter extends SystemAdapter {
  /* ── Identity ─────────────────────────────────────────────────────────── */

  get moduleId() {
    return MODULE_ID
  }

  get systemName() {
    return 'The Wildsea'
  }

  get englishVariant() {
    return 'british'
  }

  get allocationUnitTerms() {
    const term = (key, fallback) =>
      game.i18n?.has?.(key) ? game.i18n.localize(key) : fallback
    return {
      singular: term('WSSC.Unit.singular', 'success'),
      plural: term('WSSC.Unit.plural', 'successes'),
    }
  }

  /* ── Application and model bases ──────────────────────────────────────── */

  get SheetBaseClass() {
    const { HandlebarsApplicationMixin } = foundry.applications.api
    return HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)
  }

  get ItemSheetBaseClass() {
    const { HandlebarsApplicationMixin } = foundry.applications.api
    return HandlebarsApplicationMixin(foundry.applications.sheets.ItemSheetV2)
  }

  get ActorModelBaseClass() {
    return foundry.abstract.TypeDataModel
  }

  get ItemModelBaseClass() {
    return foundry.abstract.TypeDataModel
  }

  get sheetCSSClasses() {
    return ['wildsea-shipcombat']
  }

  /* ── Skills ───────────────────────────────────────────────────────────── */

  // Role skills, or a "skill|edge" pair chosen on the ship sheet; resolves
  // to the skill key and the edge key
  resolveSkill(roleSkill) {
    if (SKILL_MAP[roleSkill]) {
      const { key, edge } = SKILL_MAP[roleSkill]
      return { key, specialisation: edge }
    }
    if (roleSkill?.includes('|')) {
      const [key, specialisation] = roleSkill.split('|')
      return { key, specialisation: edgeKey(specialisation) }
    }
    throw new Error(`${MODULE_ID} | unknown role skill "${roleSkill}"`)
  }

  getDefaultRoleSkillMapping() {
    return Object.fromEntries(
      Object.entries(ROLE_SKILLS).map(([role, roleSkill]) => {
        const { key, edge } = SKILL_MAP[roleSkill]
        return [
          role,
          {
            skillKey: key,
            specialisation: wildseaLabel(edge),
            rootLabel: wildseaLabel(key),
            label: `${wildseaLabel(key)} + ${wildseaLabel(edge)}`,
          },
        ]
      }),
    )
  }

  getSkillLabel(key) {
    return wildseaLabel(key)
  }

  async getRoleSkillOptions() {
    const { edges, skills } = CONFIG.wildsea
    return skills
      .flatMap((skill) =>
        edges.map((edge) => ({
          value: `${skill}|${wildseaLabel(edge)}`,
          skillKey: skill,
          specName: wildseaLabel(edge),
          label: `${wildseaLabel(skill)} + ${wildseaLabel(edge)}`,
        })),
      )
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  // The dice a skill adds to a pool (the edge depends on the approach)
  getSkillScore(actor, skillKey) {
    const skills = actor?.system?.skills
    if (!skills || !(skillKey in skills)) return null
    return skills[skillKey] ?? 0
  }

  isCrewActorEligible(actor) {
    return actor?.type === 'player'
  }

  /* ── Rolls ────────────────────────────────────────────────────────────── */

  getRollDiceIcon() {
    return 'fa-dice-six'
  }

  // Rolls a Wildsea pool; positive modifiers are advantage dice, negative
  // ones cut the pool
  async _rollPool(pool, { flavor = '', speaker = {} } = {}) {
    const [roll, outcome] = await game.wildsea.dice.rollPool(pool)
    const SL = poolSuccessLevel(outcome)

    const renderTemplate =
      foundry.applications?.handlebars?.renderTemplate ??
      globalThis.renderTemplate
    const content = await renderTemplate(
      'systems/wildsea/templates/chat/roll.hbs',
      outcome,
    )
    const message = await ChatMessage.create({
      user: game.user.id,
      speaker,
      flavor,
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
      flags: { [MODULE_ID]: { SL } },
    })
    return { SL, roll, outcome, message }
  }

  _crewPool(crewActor, roleSkill, modifier = 0) {
    const { key, specialisation } = this.resolveSkill(roleSkill)
    const edgeDice =
      (crewActor?.system?.edges?.[specialisation] ?? 0) > 0 ? 1 : 0
    return {
      edge: specialisation,
      edgeDice,
      skillType: 'skill',
      skillKey: key,
      skillDice: crewActor?.system?.skills?.[key] ?? 0,
      advantage: Math.max(0, modifier),
      advantageDice: Math.max(0, modifier),
      cut: Math.max(0, -modifier),
    }
  }

  async rollSkillTest(crewActor, roleSkill, options = {}) {
    const { SL, roll, message } = await this._rollPool(
      this._crewPool(crewActor, roleSkill, Math.round(options.modifier ?? 0)),
      {
        flavor:
          options.flavor ??
          this.getSkillLabel(this.resolveSkill(roleSkill).key),
        speaker:
          options.speaker ?? ChatMessage.getSpeaker({ actor: crewActor }),
      },
    )
    return { SL, succeeded: SL > 0, roll, messageId: message?.id ?? '' }
  }

  parseRollResultFromMessage(message) {
    const SL = message?.getFlag?.(MODULE_ID, 'SL')
    return {
      SL: typeof SL === 'number' ? SL : null,
      roll: message?.rolls?.[0] ?? null,
    }
  }

  // A conflict is enough to overclock, at a cost
  isOverclockSuccess(result) {
    return (result?.SL ?? -1) > 0
  }

  /* ── Initiative ───────────────────────────────────────────────────────── */

  // Highest die, with the success level as a tie-breaker
  async rollShipInitiative(crewActor, roleSkill, options = {}) {
    const { SL, outcome, roll, message } = await this._rollPool(
      this._crewPool(crewActor, roleSkill),
      {
        flavor: options.flavor ?? '',
        speaker:
          options.speaker ?? ChatMessage.getSpeaker({ actor: crewActor }),
      },
    )
    return { total: outcome.total + Math.max(0, SL) / 10, roll, message }
  }

  async rollShipInitiativeFromAttribute(
    attributeValue,
    flavorLabel,
    options = {},
  ) {
    const dice = Math.max(0, parseInt(attributeValue) || 0)
    const { SL, outcome, roll, message } = await this._rollPool(
      { ratingDice: dice },
      { flavor: flavorLabel, speaker: options.speaker ?? {} },
    )
    return { total: outcome.total + Math.max(0, SL) / 10, roll, message }
  }

  /* ── Hit resolution ───────────────────────────────────────────────────── */

  getRollFormula() {
    return '1d6'
  }

  getModifierStepSize() {
    return 1
  }

  getHitBonusStep() {
    return 1
  }

  getAccuracyAllocationStep() {
    return 1
  }

  getSensorDisruptionPenalty() {
    return 1
  }

  getMaxDecayBands() {
    return 3
  }

  // Ships are hit on a conflict; the pilot's evasion makes it harder
  getTargetAC(actor) {
    const evasion = actor?.system?.resources?.pilot?.allocEvasion ?? 0
    return Math.min(6, HIT_TARGET + evasion)
  }

  computeSuccessLevel(roll, target = HIT_TARGET) {
    const die = naturalDie(roll)
    if (die === 6) return 2
    if (die === 1) return -3
    const total = roll?.total ?? 0
    return total >= target ? 1 : Math.min(-1, total - target)
  }

  isHit(roll, accuracy, targetAC = null) {
    const die = naturalDie(roll)
    if (die === 6) return true
    if (die === 1) return false
    return (roll?.total ?? 0) + accuracy >= (targetAC ?? HIT_TARGET)
  }

  // Fire for Effect widens the critical range by its points
  isCriticalHit(roll, _accuracy, _targetAC = null, traits = {}) {
    return naturalDie(roll) >= Math.max(2, 6 - (traits?.ffeReduction ?? 0))
  }

  isCriticalMiss(roll) {
    return naturalDie(roll) === 1
  }

  isJam(roll, _accuracy, traits) {
    return !!traits?.unreliable && naturalDie(roll) === 1
  }

  formatModifier(value) {
    return `${value >= 0 ? '+' : ''}${value}`
  }

  formatTargetNumber(target) {
    return `${target}+`
  }

  formatAccuracyDisplay(accuracy, targetAC = null) {
    return `1d6 ${this.formatModifier(accuracy)} ⇒ ${targetAC ?? HIT_TARGET}+`
  }

  formatChatAccuracyDisplay(_accuracy, targetAC) {
    return `${targetAC ?? HIT_TARGET}+`
  }

  formatChatHitMod(accuracy) {
    return accuracy === null ? null : this.formatModifier(accuracy)
  }

  // A Wildsea pool of one die plus one per point of modifier
  async resolveHitRoll(context) {
    const { modifiers = [], weaponItem, targetActor, options = {} } = context
    const total = modifiers.reduce((sum, m) => sum + (m.value ?? 0), 0)

    const { SL, roll, message } = await this._rollPool(
      { ratingDice: Math.max(0, 1 + Math.round(total)) },
      {
        flavor: options.flavor ?? weaponItem?.name ?? '',
        speaker:
          options.speaker ??
          (targetActor ? ChatMessage.getSpeaker({ actor: targetActor }) : {}),
      },
    )

    return {
      hit: SL > 0,
      sl: SL,
      roll,
      message,
      displayTarget: this.getTargetAC(targetActor),
      breakdownParts: modifiers
        .filter((m) => m.value)
        .map(
          (m) => `${m.label ?? m.key ?? '?'}: ${this.formatModifier(m.value)}`,
        ),
    }
  }

  /* ── Damage types ─────────────────────────────────────────────────────── */

  getDamageTypeChoices() {
    return (CONFIG.wildsea?.damageTypes ?? [])
      .map((value) => ({
        value,
        label: game.i18n.localize(`wildsea.DAMAGE.${value}`),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  getWeaponDamageType(weapon) {
    const type = weapon?.system?.damageType
    return type ? game.i18n.localize(`wildsea.DAMAGE.${type}`) : null
  }

  getRamDamageType() {
    return game.i18n.localize('wildsea.DAMAGE.blunt')
  }

  getRamDamageTypeKey() {
    return 'blunt'
  }
}
