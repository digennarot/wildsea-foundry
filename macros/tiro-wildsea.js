/**
 * Wildsea – Tiro di dadi (macro per FoundryVTT v13/v14, sistema Wildsea)
 *
 * Chiede riserva, riduzione e tipo di tiro, poi usa lo stesso motore del
 * vassoio dei dadi (game.wildsea.rollTray): regole, testi tradotti e scheda
 * in chat sono quelli del sistema.
 */

if (!game.wildsea?.rollTray) {
  ui.notifications.error('Questa macro richiede il sistema Wildsea con il vassoio dei dadi.')
  return
}

const { contexts, maxDice, maxCut } = CONFIG.wildsea.diceTray
const i18n = game.i18n
const range = (from, to) => Array.from({ length: to - from + 1 }, (_v, i) => from + i)
const options = (entries, selected) =>
  entries
    .map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`)
    .join('')

const content = `
  <div class="form-group">
    <label>${i18n.localize('wildsea.dicePoolTitle')}</label>
    <select name="dice">${options(range(1, maxDice).map((n) => [n, `${n}d6`]), 1)}</select>
  </div>
  <div class="form-group">
    <label>${i18n.localize('wildsea.cut')}</label>
    <select name="cut">${options(range(0, maxCut).map((n) => [n, n || i18n.localize('wildsea.none')]), 0)}</select>
  </div>
  <div class="form-group">
    <label>${i18n.localize('wildsea.TRAY.context')}</label>
    <select name="context">${options(
      contexts.map((c) => [c, i18n.localize(`wildsea.TRAY.CONTEXTS.${c}.label`)]),
      'action',
    )}</select>
  </div>
  <div class="form-group">
    <label data-tooltip="${i18n.localize('wildsea.TRAY.noPoolHint')}">${i18n.localize('wildsea.TRAY.noPool')}</label>
    <input type="checkbox" name="noPool">
  </div>`

const choice = await foundry.applications.api.DialogV2.wait({
  window: { title: i18n.localize('wildsea.dicePoolTitle'), icon: 'fa-solid fa-dice-d6' },
  content,
  rejectClose: false,
  buttons: [
    {
      action: 'roll',
      label: i18n.format('wildsea.TRAY.roll', { dice: 'N' }),
      icon: 'fa-solid fa-dice',
      default: true,
      callback: (_event, button) => {
        const form = button.form.elements
        return {
          dice: Number(form.dice.value),
          cut: Number(form.cut.value),
          context: form.context.value,
          noPool: form.noPool.checked,
        }
      },
    },
    { action: 'cancel', label: i18n.localize('wildsea.cancel'), icon: 'fa-solid fa-times' },
  ],
})

if (choice && choice !== 'cancel') await game.wildsea.rollTray(choice)
