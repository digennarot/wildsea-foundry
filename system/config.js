export const WILDSEA = {}
WILDSEA.root_path = 'systems/wildsea'
WILDSEA.defaultTokens = {
  player: `${WILDSEA.root_path}/assets/tokens/person.png`,
  ship: `${WILDSEA.root_path}/assets/tokens/iron-hulled-warship.png`,
  npc: 'icons/svg/mystery-man.svg',
}
WILDSEA.designTypes = ['size', 'frame', 'hull', 'bite', 'engine']
WILDSEA.edgeMax = 1
WILDSEA.edges = [
  'grace',
  'iron',
  'instinct',
  'sharps',
  'teeth',
  'tides',
  'veils',
]
WILDSEA.languageMax = 3
WILDSEA.languages = [
  'lowSour',
  'cthonic',
  'saprekk',
  'gaudimm',
  'knock',
  'brasstongue',
  'rakaSpit',
  'lyreBite',
  'oldHand',
  'signalling',
  'highvin',
]
WILDSEA.milestoneSubtypes = ['major', 'minor']
WILDSEA.resourceTypes = ['salvage', 'specimen', 'whisper', 'chart']
WILDSEA.backgroundFields = ['bloodline', 'origin', 'post']
// attribute types that become slim items when dropped on a player sheet
WILDSEA.slimDropTypes = {
  drive: ['drives', null],
  mire: ['mires', null],
  milestoneMajor: ['milestones', 'major'],
  milestoneMinor: ['milestones', 'minor'],
}
WILDSEA.shipRatings = ['armour', 'seals', 'speed', 'saws', 'stealth', 'tilt']
WILDSEA.skillMax = 3
WILDSEA.skills = [
  'brace',
  'break',
  'concoct',
  'cook',
  'delve',
  'flourish',
  'hack',
  'harvest',
  'hunt',
  'outwit',
  'rattle',
  'scavenge',
  'sense',
  'study',
  'sway',
  'tend',
  'vault',
  'wavewalk',
]
WILDSEA.slimDefaults = {
  mires: {
    track: {
      max: 2,
      value: 0,
      burn: 0,
    },
  },
  reputations: {
    track: {
      max: 3,
      value: 0,
    },
  },
  designEffects: {
    rating: '',
    value: 0,
  },
}
WILDSEA.trackVisibilityOptions = {
  open: 'wildsea.TRACKS.open',
  hidden: 'wildsea.TRACKS.hidden',
  secret: 'wildsea.TRACKS.secret',
}

WILDSEA.adversarySizes = {
  small: 'wildsea.small',
  medium: 'wildsea.medium',
  large: 'wildsea.large',
  huge: 'wildsea.huge',
  leviathan: 'wildsea.leviathan',
  variable: 'wildsea.variable',
  swarm: 'wildsea.swarm',
}

WILDSEA.npcKinds = ['accessory', 'integrated']
// attribute types that fill in an NPC sheet field when dropped
WILDSEA.npcDropFields = {
  bloodline: 'bloodline',
  post: 'profession',
}
// common name elements from the rulebook appendix, keyed by language
WILDSEA.nameSyllables = {
  lowSour: ['Ta', 'To', 'Te', 'Ra', 'Ro', 'Re', 'Ri', 'Ja', 'Jo', 'Je', 'Ka', 'Ko', 'Ke', 'Ku', 'Za', 'Zo', 'Ze', 'Tza', 'Tzi', 'Gra', 'Go'],
  cthonic: ['Wood', 'Rise', 'Carboni', 'Solombrino', 'Cho', 'Lake', 'Wang', 'Smet', 'Dole', 'Rin', 'Bury', 'Ness', 'Ling'],
  saprekk: ['Om', 'On', 'Ot', 'Ol', 'Ka', 'Hel', 'Nor', 'Sa', 'So', 'Si', 'Ga', 'Gu', 'Ge', 'Ne', 'Na', 'Ns', 'Ms', 'Gs'],
  gaudimm: ['Ho', 'Hu', 'Hara', 'Hake', 'Ha', 'Bo', 'Be', 'Basu', 'Bodi', 'Do', 'De', 'Da', 'Dura', 'Disa', 'Fa', 'Fe', 'Fo', 'Ro'],
  knock: ['Che', 'Chao', 'Cze', 'Cza', 'Tzi', 'Tzo', 'Otz', 'Za', 'Ze', 'To', 'Te', 'K'],
}

export const registerSystemSettings = () => {
  game.settings.register('wildsea', 'showBurnTooltip', {
    config: true,
    scope: 'client',
    name: 'SETTINGS.showBurnTooltip.label',
    hint: 'SETTINGS.showBurnTooltip.hint',
    type: Boolean,
    default: true,
  })

  game.settings.register('wildsea', 'showAttributeTooltip', {
    config: true,
    scope: 'client',
    name: 'SETTINGS.showAttributeTooltip.label',
    hint: 'SETTINGS.showAttributeTooltip.hint',
    type: Boolean,
    default: true,
  })

  game.settings.register('wildsea', 'showDepth', {
    config: true,
    scope: 'world',
    name: 'SETTINGS.showDepth.label',
    hint: 'SETTINGS.showDepth.hint',
    type: Boolean,
    default: false,
    requiresReload: true,
  })

  game.settings.register('wildsea', 'systemMigrationVersion', {
    config: false,
    scope: 'world',
    type: String,
    default: '',
  })
}
