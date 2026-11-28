/**
 * The applied app skin (ADR 0007): its id on <html data-skin> and its generated CSS in <style id="vibechat-skin">.
 * Both are cached in localStorage so the boot script in index.html / shell.html restores them before the first
 * paint. The skin catalogue (presets/skins.ts) loads with Settings only; the default skin is the stylesheet itself.
 */
export const SKIN_KEY = "vibechat.skin"
export const SKIN_CSS_KEY = "vibechat.skin.css"
export const SKIN_STYLE_ID = "vibechat-skin"
export const DEFAULT_SKIN_ID = "ember"

export function readSkinId(): string {
  try {
    return globalThis.localStorage?.getItem(SKIN_KEY) || DEFAULT_SKIN_ID
  } catch {
    return DEFAULT_SKIN_ID
  }
}

/** Apply a skin: id and CSS ("" for the default skin), saved for the next start. */
export function applySkinCss(id: string, css: string, doc: Document | undefined = globalThis.document): void {
  if (doc) {
    const root = doc.documentElement
    if (id === DEFAULT_SKIN_ID) delete root.dataset.skin
    else root.dataset.skin = id
    let el = doc.getElementById(SKIN_STYLE_ID)
    if (css && !el) {
      el = doc.createElement("style")
      el.id = SKIN_STYLE_ID
      doc.head.appendChild(el)
    }
    if (el) el.textContent = css
  }
  try {
    const store = globalThis.localStorage
    if (id === DEFAULT_SKIN_ID) {
      store?.removeItem(SKIN_KEY)
      store?.removeItem(SKIN_CSS_KEY)
    } else {
      store?.setItem(SKIN_KEY, id)
      store?.setItem(SKIN_CSS_KEY, css)
    }
  } catch {
    /* private mode: this window only */
  }
}
