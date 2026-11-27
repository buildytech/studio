import { expect, test } from "bun:test"
import { applyTheme, storedTheme, THEME_KEY } from "./theme"

test("dark by default, light only when stored", () => {
  expect(storedTheme(undefined)).toBe("dark")
  expect(storedTheme({ getItem: () => null })).toBe("dark")
  expect(storedTheme({ getItem: (k) => (k === THEME_KEY ? "light" : null) })).toBe("light")
  expect(storedTheme({ getItem: () => { throw new Error("denied") } })).toBe("dark")
})

test("the dark class on the root follows the theme", () => {
  const set = new Set<string>()
  const classList = { toggle: (c: string, on: boolean) => (on ? set.add(c) : set.delete(c), on) } as unknown as DOMTokenList
  applyTheme("light", false, { classList })
  expect(set.has("dark")).toBe(false)
  applyTheme("dark", false, { classList })
  expect(set.has("dark")).toBe(true)
})
