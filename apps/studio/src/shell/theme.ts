/** The start screen's theme: dark (the Studio's tokens) by default, light on request; stored in localStorage. */
export type Theme = "dark" | "light"
export const THEME_KEY = "buildy-shell-theme"

export function storedTheme(storage: Pick<Storage, "getItem"> | undefined = globalThis.localStorage): Theme {
  try {
    return storage?.getItem(THEME_KEY) === "light" ? "light" : "dark"
  } catch {
    return "dark"
  }
}

export function applyTheme(theme: Theme, save = false, root: { classList: DOMTokenList } | undefined = globalThis.document?.documentElement): void {
  root?.classList.toggle("dark", theme === "dark")
  if (!save) return
  try {
    globalThis.localStorage?.setItem(THEME_KEY, theme)
  } catch {
    /* private mode: the choice lasts for this window only */
  }
}
