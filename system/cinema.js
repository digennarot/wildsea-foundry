import { WILDSEA } from './config.js'

// Storyteller's Cinema is required by the system: make sure it is enabled,
// install the Wildsea skins once per world and give scenes the Foxloft
// illustration as their default cinematic background
const MODULE = 'storyteller-cinema'
const ASSETS = `${WILDSEA.root_path}/st-cinema`
export const CINEMA_BACKGROUND = `${ASSETS}/wildsea-foxloft.webp`
const DEFAULT_SKIN = 'wildsea-verdant-hull'
// bump to install the skins again in existing worlds
const DEFAULTS_VERSION = '1'
// remembers, for this browser session, that we already tried enabling the
// module, so a module that fails to load cannot cause a reload loop
const ENABLE_ATTEMPT = 'wildsea.cinemaEnableAttempt'

const SKIN_FILES = ['wildsea-skin.json', 'biolum-skin.json', 'biolum-skin-textured.json']
// skin options holding texture paths, relative to st-cinema in the files
const TEXTURE_OPTIONS = ['barTexture', 'backgroundTexture', 'overlayTexture']

export const registerCinemaSettings = () => {
  game.settings.register('wildsea', 'cinemaDefaults', {
    config: false,
    scope: 'world',
    type: String,
    default: '',
  })

  game.settings.register('wildsea', 'cinemaDefaultBackground', {
    config: true,
    scope: 'world',
    name: 'SETTINGS.cinemaDefaultBackground.label',
    hint: 'SETTINGS.cinemaDefaultBackground.hint',
    type: Boolean,
    default: true,
  })
}

const useDefaultBackground = () =>
  game.modules.get(MODULE)?.active &&
  game.settings.get('wildsea', 'cinemaDefaultBackground')

export const setupCinema = () => {
  // new scenes get the default background, unless they come from a
  // compendium or another scene, which keep what they were made with
  Hooks.on('preCreateScene', (scene, data, _options, userId) => {
    if (userId !== game.user.id || !useDefaultBackground()) return
    if (foundry.utils.getProperty(data, `flags.${MODULE}.cinematicBg`)) return
    const stats = data._stats ?? {}
    if (stats.compendiumSource || stats.duplicateSource) return
    if (foundry.utils.getProperty(data, 'flags.core.sourceId')) return
    scene.updateSource({ [`flags.${MODULE}.cinematicBg`]: CINEMA_BACKGROUND })
  })

  // Scenes that never had a cinematic background (imported, duplicated or
  // made after the one-off default) would open cinematic mode on black: the
  // active GM gives them the default when viewing them. A background that
  // was cleared on purpose is an empty string and stays as it is.
  Hooks.on('canvasReady', ({ scene }) => {
    if (!scene || !game.users.activeGM?.isSelf || !useDefaultBackground()) return
    if (scene.getFlag(MODULE, 'cinematicBg') !== undefined) return
    scene.setFlag(MODULE, 'cinematicBg', CINEMA_BACKGROUND)
  })

  // Storyteller's Cinema looks for an "appearance" or "basic" tab and on
  // Foundry 13/14 (whose first tab is "basics") falls back to the last tab,
  // where its background field is easy to miss: move it to the first tab.
  // Registered on ready so it runs after the module's own render hook.
  Hooks.once('ready', () => {
    Hooks.on('renderSceneConfig', (_app, html) => {
      const root = html instanceof HTMLElement ? html : html?.[0]
      const block = root?.querySelector(`.${MODULE}-config`)
      const basics = root?.querySelector('.tab[data-tab="basics"]')
      if (block && basics && block.parentElement !== basics) basics.append(block)
    })
  })
}

// Called from the ready hook after the system migrations, so a reload never
// interrupts them. Only the active GM does the work.
export const readyCinema = async () => {
  if (!game.users.activeGM?.isSelf) return

  if (!game.modules.get(MODULE)?.active) return enableCinema()
  sessionStorage.removeItem(ENABLE_ATTEMPT)

  if (game.settings.get('wildsea', 'cinemaDefaults') === DEFAULTS_VERSION) return
  if (!(await installSkins())) return

  await setDefaultBackgrounds()
  await game.settings.set('wildsea', 'cinemaDefaults', DEFAULTS_VERSION)
}

const notifyError = (key, data = {}) =>
  ui.notifications.error(game.i18n.format(`wildsea.CINEMA.${key}`, data), {
    permanent: true,
  })

// enable the module and the modules it requires, then reload the world
async function enableCinema() {
  const module = game.modules.get(MODULE)
  if (!module) return notifyError('missing')

  const required = [
    MODULE,
    ...Array.from(module.relationships?.requires ?? [], (r) => r.id),
  ]
  const missing = required.filter((id) => !game.modules.get(id))
  if (missing.length)
    return notifyError('missingRequired', { modules: missing.join(', ') })

  // modules Foundry would refuse to load (incompatible core version,
  // missing or outdated dependencies)
  const unavailable = required.filter((id) => game.modules.get(id).unavailable)
  if (unavailable.length)
    return notifyError('unavailable', { modules: unavailable.join(', ') })

  // already enabled once in this session, but still not active after the
  // reload: stop here instead of reloading again
  if (sessionStorage.getItem(ENABLE_ATTEMPT)) return notifyError('notLoaded')

  if (!game.user.can('SETTINGS_MODIFY')) return notifyError('noPermission')

  const setting =
    foundry.applications?.sidebar?.apps?.ModuleManagement?.SETTING ??
    'moduleConfiguration'
  const config = { ...game.settings.get('core', setting) }
  for (const id of required) config[id] = true

  try {
    await game.settings.set('core', setting, config)
  } catch (err) {
    console.error('wildsea | Could not enable Storyteller Cinema', err)
    return notifyError('noPermission')
  }

  sessionStorage.setItem(ENABLE_ATTEMPT, '1')
  ui.notifications.info(game.i18n.localize('wildsea.CINEMA.enabling'))
  foundry.utils.debouncedReload()
}

async function loadSkin(file) {
  try {
    const response = await fetch(`${ASSETS}/${file}`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return await response.json()
  } catch (err) {
    console.error(`wildsea | Could not load the cinema skin ${file}`, err)
    return null
  }
}

// Returns true once the default skin is registered and applied
async function installSkins() {
  const skins = window.StorytellerCinema?.skins
  if (!skins) {
    console.error('wildsea | Storyteller Cinema skin API not found')
    return false
  }

  const loaded = await Promise.all(SKIN_FILES.map(loadSkin))
  for (const skin of loaded.filter(Boolean)) {
    // The module fetches every path in `assets` through its own proxy, and
    // reads textures from the options (SkinManager._injectCSS), so local
    // textures go in the options with their full path
    skin.assets = {}
    skin.autoDownload = false
    skin.options ??= {}
    for (const key of TEXTURE_OPTIONS)
      if (skin.options[key] && !skin.options[key].includes('/'))
        skin.options[key] = `${ASSETS}/${skin.options[key]}`

    try {
      await skins.register(skin, true)
    } catch (err) {
      console.error(`wildsea | Could not register the cinema skin ${skin.id}`, err)
    }
  }

  if (!skins.skins?.has(DEFAULT_SKIN)) {
    console.error(`wildsea | Cinema skin ${DEFAULT_SKIN} was not registered`)
    return false
  }

  try {
    await skins.apply(DEFAULT_SKIN)
    return true
  } catch (err) {
    console.error(`wildsea | Could not apply the cinema skin ${DEFAULT_SKIN}`, err)
    return false
  }
}

// Scenes are updated one by one, so an invalid scene does not stop the others
async function setDefaultBackgrounds() {
  if (!game.settings.get('wildsea', 'cinemaDefaultBackground')) return

  for (const scene of game.scenes) {
    if (scene.getFlag(MODULE, 'cinematicBg')) continue
    try {
      await scene.setFlag(MODULE, 'cinematicBg', CINEMA_BACKGROUND)
    } catch (err) {
      console.error(`wildsea | Could not set the cinematic background of ${scene.name}`, err)
    }
  }
}
