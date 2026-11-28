import { describe, expect, test } from "bun:test"
import dictionary from "./ui.en.json"
import ruDictionary from "./ui.ru.json"
import { detectLocale, t } from "./index"

const CYRILLIC = /[\u0400-\u04FF]/
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

function assertCatalog(doc: { locale: string; messages: Record<string, string> }, locale: string) {
  expect(doc.locale).toBe(locale)
  for (const [key, value] of Object.entries(doc.messages)) {
    expect(typeof value, key).toBe("string")
    expect(value.trim().length, key).toBeGreaterThan(0)
  }
}

function assertSameKeysAndPlaceholders(
  en: Record<string, string>,
  ru: Record<string, string>,
  label: string,
) {
  expect(Object.keys(ru).sort(), label).toEqual(Object.keys(en).sort())
  for (const key of Object.keys(en)) {
    expect(placeholders(ru[key]!), `${label} ${key}`).toEqual(placeholders(en[key]!))
  }
}

describe("dictionary", () => {
  test("DictionaryV04 shape: a locale and non-empty string messages", () => {
    assertCatalog(dictionary, "en")
  })

  test("t fills placeholders and leaves unknown ones", () => {
    expect(t("projects.updated", { when: "2m ago" })).toBe("Updated 2m ago")
    expect(t("projects.updated")).toBe("Updated {when}")
    expect(t("editor.zipDownload")).toBe("Download ZIP")
    expect(t("editor.zipImport")).toBe("Import ZIP")
  })
})

describe("locales", () => {
  test("EN dictionaries contain no Cyrillic", async () => {
    const files = ["./ui.en.json", "./help.en.json", "./setup.en.json", "./settings.en.json"] as const
    for (const file of files) {
      const doc = (await import(file)).default as { messages: Record<string, string> }
      for (const [key, value] of Object.entries(doc.messages)) {
        expect(CYRILLIC.test(value), `${file} ${key}`).toBe(false)
      }
    }
  })

  test("RU dictionaries match EN keys and placeholders", async () => {
    assertCatalog(ruDictionary, "ru")
    assertSameKeysAndPlaceholders(dictionary.messages, ruDictionary.messages, "ui")
    const helpEn = (await import("./help.en.json")).default
    const helpRu = (await import("./help.ru.json")).default
    assertCatalog(helpEn, "en")
    assertCatalog(helpRu, "ru")
    assertSameKeysAndPlaceholders(helpEn.messages, helpRu.messages, "help")
    const setupEn = (await import("./setup.en.json")).default
    const setupRu = (await import("./setup.ru.json")).default
    assertCatalog(setupEn, "en")
    assertCatalog(setupRu, "ru")
    assertSameKeysAndPlaceholders(setupEn.messages, setupRu.messages, "setup")
    const settingsEn = (await import("./settings.en.json")).default
    const settingsRu = (await import("./settings.ru.json")).default
    assertCatalog(settingsEn, "en")
    assertCatalog(settingsRu, "ru")
    assertSameKeysAndPlaceholders(settingsEn.messages, settingsRu.messages, "settings")
    expect(ruDictionary.messages["editor.zipDownload"]).toBe("Скачать ZIP")
    expect(ruDictionary.messages["editor.zipImport"]).toBe("Импорт ZIP")
  })

  test("detectLocale: English default, navigator.language, ?lang override", () => {
    expect(detectLocale({ languages: [] })).toBe("en")
    expect(detectLocale({ languages: ["de-DE"] })).toBe("en")
    expect(detectLocale({ languages: ["ru"] })).toBe("ru")
    expect(detectLocale({ languages: ["ru-RU", "en"] })).toBe("ru")
    expect(detectLocale({ languages: ["en-US"] })).toBe("en")
    expect(detectLocale({ search: "?lang=ru", languages: ["en-US"] })).toBe("ru")
    expect(detectLocale({ search: "?lang=en", languages: ["ru-RU"] })).toBe("en")
    expect(detectLocale({ search: "?lang=de", languages: ["ru"] })).toBe("ru")
  })
})

describe("help dictionary", () => {
  test("every help key has English and Russian words", async () => {
    const help = (await import("./help.en.json")).default
    expect(Object.keys(help.messages).length).toBeGreaterThan(0)
  })
})

describe("setup dictionary", () => {
  test("every step, state and problem of the contract has words in EN and RU", async () => {
    const setup = (await import("./setup.en.json")).default
    const setupRu = (await import("./setup.ru.json")).default
    const { DESKTOP_PROVISION_STEPS, DesktopProvisionStepStateSchema, DesktopProvisionProblemCodeSchema } =
      await import("@buildy/agent-contract")
    const keys = [
      ...DESKTOP_PROVISION_STEPS.map((s) => `step.${s}`),
      ...DesktopProvisionStepStateSchema.options.map((s) => `state.${s}`),
      ...DesktopProvisionProblemCodeSchema.options.map((s) => `problem.${s}`),
    ]
    const en = setup.messages as Record<string, string>
    const ru = setupRu.messages as Record<string, string>
    for (const k of keys) {
      expect(en[k], `en ${k}`).toBeString()
      expect(ru[k], `ru ${k}`).toBeString()
    }
  })
})
