/** Copy text — works after async gaps (dropdowns/dialogs) where Clipboard API loses focus. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Clipboard API blocked or document not focused — try fallback
  }

  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '0'
    el.style.width = '2em'
    el.style.height = '2em'
    el.style.padding = '0'
    el.style.border = 'none'
    el.style.outline = 'none'
    el.style.boxShadow = 'none'
    el.style.background = 'transparent'
    document.body.appendChild(el)
    el.focus()
    el.select()
    el.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    return ok
  } catch {
    return false
  }
}
