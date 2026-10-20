export const enrich = async (html, secrets = false) => {
  if (html)
    return await TextEditor.enrichHTML(html, {
      secrets: secrets,
      async: true,
    })

  return html
}

export const listToRows = (array, columns) => {
  const result = []
  let currentRow = []

  for (const index in array) {
    currentRow.push(array[index])

    if ((parseInt(index) + 1) % columns === 0) {
      result.push(currentRow)
      currentRow = []
    }
  }

  if (currentRow.length > 0)
    result.push(Array.from({ ...currentRow, length: columns }))

  return result
}

export const clamp = (value, max, min = 0) =>
  Math.min(max, Math.max(min, value))

export const deleteAndReturn = (map, key) => {
  var a = map[key]
  delete map[key]
  return a
}

export const clickModifiers = (event) => event.shiftKey || event.ctrlKey

// Anchors a non-popout panel after #ui-top and renders it whenever the canvas is ready.
// If #ui-top is not in the DOM yet, the anchor is retried right before the first render,
// so the panel never renders without its anchor and never leaves a duplicate id behind.
export const mountPanel = (id, getPanel) => {
  const insertAnchor = () => {
    const top = document.querySelector('#ui-top')
    if (!top) return false

    const template = document.createElement('template')
    template.setAttribute('id', id)
    top.insertAdjacentElement('afterend', template)
    return true
  }

  insertAnchor()

  Hooks.on('canvasReady', () => {
    if (!document.getElementById(id) && !insertAnchor())
      console.warn(`wildsea | #ui-top not found, cannot anchor panel ${id}`)
    getPanel().render(true)
  })
}
