/** Synchronous copy — fallback when Clipboard API is unavailable or rejected. */
export function copyTextToClipboardSync(text: string): boolean {
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

/**
 * Copy while the browser still treats the action as a user gesture.
 * Call synchronously from click / onSelect — do not await before calling this.
 */
export function copyTextInUserGesture(
  text: string,
  onResult: (ok: boolean) => void,
): void {
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(text)
      .then(() => onResult(true))
      .catch(() => onResult(copyTextToClipboardSync(text)))
    return
  }
  onResult(copyTextToClipboardSync(text))
}

/** Copy text — prefers Clipboard API, then execCommand. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    copyTextInUserGesture(text, resolve)
  })
}
