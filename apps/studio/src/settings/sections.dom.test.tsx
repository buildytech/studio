import { describe, expect, test } from "bun:test"
import en from "../i18n/settings.en.json"
import ru from "../i18n/settings.ru.json"
import { SETTINGS_ICON_NAMES } from "../app-icons/settings-icons"
import { defineSettingsSections, groupSections, resolveSection, searchSections, visibleSections, type SettingsSection } from "./registry"
import { DEFAULT_SETTINGS_SECTION, SETTINGS_SECTIONS } from "./sections"

const noop = () => Promise.resolve({ default: () => null })
const section = (id: string, over: Partial<SettingsSection> = {}): SettingsSection =>
  ({ id, group: "app", order: 1, icon: "info", label: "section.about", storage: ["client"], load: noop, ...over }) as SettingsSection

describe("built-in sections", () => {
  test("the starting six, General first, in group order", () => {
    expect(SETTINGS_SECTIONS.map((s) => s.id)).toEqual(["general", "appearance", "models", "account", "server", "about"])
    expect(SETTINGS_SECTIONS[0]!.id).toBe(DEFAULT_SETTINGS_SECTION)
  })

  test("every section has its words (label, lead, keywords) in EN and RU, a group heading and a known icon", () => {
    for (const s of SETTINGS_SECTIONS) {
      for (const dict of [en.messages, ru.messages] as Record<string, string>[]) {
        for (const key of [s.label, `${s.label}.lead`, `${s.label}.keywords`, `group.${s.group}`]) expect(dict[key], `${s.id} ${key}`).toBeTruthy()
      }
      expect(SETTINGS_ICON_NAMES).toContain(s.icon)
      expect(s.storage.length).toBeGreaterThan(0)
    }
  })

  test("every section component loads (a default export)", async () => {
    for (const s of SETTINGS_SECTIONS) expect(typeof (await s.load()).default, s.id).toBe("function")
  })

  test("search finds sections by words in either language", () => {
    const text = (k: string) => (en.messages as Record<string, string>)[k] ?? ""
    const textRu = (k: string) => (ru.messages as Record<string, string>)[k] ?? ""
    expect(searchSections(SETTINGS_SECTIONS, "dark", text as never).map((s) => s.id)).toEqual(["appearance"])
    expect(searchSections(SETTINGS_SECTIONS, "тёмная", textRu as never).map((s) => s.id)).toEqual(["appearance"])
    expect(searchSections(SETTINGS_SECTIONS, "ТЕМНАЯ", textRu as never).map((s) => s.id)).toEqual(["appearance"])
    expect(searchSections(SETTINGS_SECTIONS, "cursor key", text as never).map((s) => s.id)).toEqual(["models"])
    expect(searchSections(SETTINGS_SECTIONS, "  ", text as never)).toHaveLength(SETTINGS_SECTIONS.length)
    expect(searchSections(SETTINGS_SECTIONS, "zzz", text as never)).toHaveLength(0)
  })
})

describe("registry rules", () => {
  test("ids are unique URL segments", () => {
    expect(() => defineSettingsSections([section("a"), section("a")])).toThrow("twice")
    expect(() => defineSettingsSections([section("Bad Id")])).toThrow("lowercase")
  })

  test("visibility, deep links and groups", () => {
    const list = defineSettingsSections([
      section("b", { group: "system", order: 1 }),
      section("a", { group: "app", order: 2 }),
      section("desk", { group: "system", order: 2, visible: (ctx) => ctx.conn !== null }),
    ])
    expect(list.map((s) => s.id)).toEqual(["a", "b", "desk"])
    const shown = visibleSections(list, { conn: null, caps: null })
    expect(shown.map((s) => s.id)).toEqual(["a", "b"])
    expect(resolveSection(shown, "b")?.id).toBe("b")
    expect(resolveSection(shown, "desk")?.id).toBe("a")
    expect(resolveSection(shown, undefined)?.id).toBe("a")
    expect(groupSections(shown).map((g) => g.group)).toEqual(["app", "system"])
  })
})

describe("pages", () => {
  test("Appearance: two radio groups with legends; choosing Light drops the dark class and is saved", async () => {
    const { render } = await import("solid-js/web")
    const Appearance = (await import("./sections/Appearance")).default
    const { THEME_KEY } = await import("../theme/prefs")
    document.documentElement.classList.add("dark")
    const host = document.createElement("div")
    document.body.append(host)
    render(() => <Appearance />, host)
    const sets = host.querySelectorAll("fieldset")
    expect(sets.length).toBe(2)
    for (const f of sets) expect(f.querySelector("legend")?.textContent).toBeTruthy()
    const themes = host.querySelectorAll<HTMLInputElement>('input[type="radio"][name="settings-theme"]')
    expect([...themes].map((r) => r.value)).toEqual(["light", "dark", "system"])
    for (const r of themes) expect(r.closest("label")).toBeTruthy()
    expect(host.querySelectorAll('input[name="settings-skin"]').length).toBeGreaterThanOrEqual(3)
    themes[0]!.click()
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBe("light")
    const skins = host.querySelectorAll<HTMLInputElement>('input[name="settings-skin"]')
    skins[1]!.click()
    expect(document.documentElement.dataset.skin).toBe("graphite")
    expect(document.getElementById("vibechat-skin")?.textContent).toContain('html[data-skin="graphite"]')
    skins[0]!.click()
    expect(document.documentElement.dataset.skin).toBeUndefined()
    host.remove()
  })
})
