// Foundry names the compendium folder after system.json's packFolders, in
// English. The GM's client gives it the name in the GM's language, as long as
// it still has one of the default names (a folder renamed by hand stays)
const DEFAULT_NAMES = ['The Wildsea', 'Selvapelago']

export const localizePackFolder = async () => {
  if (!game.user.isGM) return

  const folder = game.packs.get('wildsea.ship_aspects')?.folder
  const name = game.i18n.localize('wildsea.packFolder')
  if (!folder || folder.name === name || !DEFAULT_NAMES.includes(folder.name))
    return

  await folder.update({ name })
}
