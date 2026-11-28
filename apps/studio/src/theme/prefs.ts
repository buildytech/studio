import { createSignal } from "solid-js"

/**
 * The app's own light / dark mode (ADR 0007): a client setting, kept in this window's localStorage, never sent to
 * the server. "system" follows prefers-color-scheme. The boot script in index.html and shell.html applies the same
 * keys before the first paint (no flash); this module keeps it in step afterwards.
 */
export type ThemePref = "system" | "dark" | "light"
export type ThemeMode = "dark" | "light"

export const THEME_PREFS: readonly ThemePref[] = ["light", "dark", "system"]
export const THEME_KEY = "vibechat.theme"
/** The start screen's key before ADR 0007 ("dark" | "light"): read once when THEME_KEY is absent. */
export const LEGACY_THEME_KEY = "buildy-shell-theme"
/** The Studio was dark-only before ADR 0007: an owner who never chose keeps it. */
export const DEFAULT_THEME_PREF: ThemePref = "dark"

type Store = Pick<Storage, "getItem" | "setItem">

function storage(): Store | undefined {
  try {
    return globalThis.localStorage
  } catch {
    return undefined
  }
}

export function parseThemePref(raw: unknown): ThemePref | null {
  return raw === "dark" || raw === "light" || raw === "system" ? raw : null
}

export function readThemePref(store: Store | undefined = storage()): ThemePref {
  try {
    return parseThemePref(store?.getItem(THEME_KEY)) ?? parseThemePref(store?.getItem(LEGACY_THEME_KEY)) ?? DEFAULT_THEME_PREF
  } catch {
    return DEFAULT_THEME_PREF
  }
}

export function resolveThemeMode(pref: ThemePref, systemDark: boolean): ThemeMode {
  return pref === "system" ? (systemDark ? "dark" : "light") : pref
}

function systemDark(): boolean {
  return globalThis.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true
}

/** The `dark` class on <html> (the kit's custom variant and the Studio tokens read it). */
export function applyThemeMode(mode: ThemeMode, root: { classList: DOMTokenList } | undefined = globalThis.document?.documentElement): void {
  root?.classList.toggle("dark", mode === "dark")
}

const [pref, setPref] = createSignal<ThemePref>(readThemePref())
const [mode, setMode] = createSignal<ThemeMode>(resolveThemeMode(pref(), systemDark()))

/** The stored choice (Light / Dark / System). */
export const themePref = pref
/** What the window shows now. */
export const themeMode = mode

function sync(): void {
  const next = resolveThemeMode(pref(), systemDark())
  setMode(next)
  applyThemeMode(next)
}

/** Save and apply a choice. */
export function setThemePref(next: ThemePref, store: Store | undefined = storage()): void {
  try {
    store?.setItem(THEME_KEY, next)
  } catch {
    /* private mode: the choice lasts for this window only */
  }
  setPref(next)
  sync()
}

let started = false

/** Apply the stored choice and follow the system while it is "system" (and other windows' changes). Once per page. */
export function initTheme(): void {
  sync()
  if (started) return
  started = true
  globalThis.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (pref() === "system") sync()
  })
  globalThis.addEventListener?.("storage", (e: StorageEvent) => {
    if (e.key !== THEME_KEY) return
    setPref(parseThemePref(e.newValue) ?? DEFAULT_THEME_PREF)
    sync()
  })
}
