import { expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { applyThemeMode, DEFAULT_THEME_PREF, LEGACY_THEME_KEY, readThemePref, resolveThemeMode, THEME_KEY } from "./prefs"
import { SKIN_CSS_KEY, SKIN_KEY, SKIN_STYLE_ID } from "./skin"

const store = (values: Record<string, string>) => ({ getItem: (k: string) => values[k] ?? null, setItem: () => undefined })

test("the stored choice, then the start screen's old key, then dark", () => {
  expect(readThemePref(undefined)).toBe(DEFAULT_THEME_PREF)
  expect(DEFAULT_THEME_PREF).toBe("dark")
  expect(readThemePref(store({ [THEME_KEY]: "system" }))).toBe("system")
  expect(readThemePref(store({ [THEME_KEY]: "light", [LEGACY_THEME_KEY]: "dark" }))).toBe("light")
  expect(readThemePref(store({ [LEGACY_THEME_KEY]: "light" }))).toBe("light")
  expect(readThemePref(store({ [THEME_KEY]: "blue" }))).toBe("dark")
  expect(readThemePref({ getItem: () => { throw new Error("denied") }, setItem: () => undefined })).toBe("dark")
})

test("system follows prefers-color-scheme; light and dark are fixed", () => {
  expect(resolveThemeMode("system", true)).toBe("dark")
  expect(resolveThemeMode("system", false)).toBe("light")
  expect(resolveThemeMode("light", true)).toBe("light")
  expect(resolveThemeMode("dark", false)).toBe("dark")
})

test("the dark class on the root follows the mode", () => {
  const set = new Set<string>()
  const classList = { toggle: (c: string, on: boolean) => (on ? set.add(c) : set.delete(c), on) } as unknown as DOMTokenList
  applyThemeMode("light", { classList })
  expect(set.has("dark")).toBe(false)
  applyThemeMode("dark", { classList })
  expect(set.has("dark")).toBe(true)
})

test("both pages restore the same keys before the first paint", () => {
  for (const page of ["index.html", "shell.html"]) {
    const html = readFileSync(join(import.meta.dir, "../..", page), "utf8")
    for (const key of [THEME_KEY, LEGACY_THEME_KEY, SKIN_KEY, SKIN_CSS_KEY, SKIN_STYLE_ID]) expect(html, `${page} ${key}`).toContain(`"${key}"`)
    expect(html, page).toContain(`|| "${DEFAULT_THEME_PREF}"`)
    expect(html.indexOf("vibechat.theme"), page).toBeLessThan(html.indexOf("</head>"))
  }
})
