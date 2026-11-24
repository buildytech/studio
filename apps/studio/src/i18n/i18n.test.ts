import { describe, expect, test } from "bun:test"
import dictionary from "./ui.en.json"
import { t } from "./index"

describe("dictionary", () => {
  test("DictionaryV04 shape: a locale and non-empty string messages", () => {
    expect(dictionary.locale).toBe("en")
    for (const [key, value] of Object.entries(dictionary.messages)) {
      expect(typeof value, key).toBe("string")
      expect(value.trim().length, key).toBeGreaterThan(0)
    }
  })

  test("t fills placeholders and leaves unknown ones", () => {
    expect(t("projects.updated", { when: "2m ago" })).toBe("Updated 2m ago")
    expect(t("projects.updated")).toBe("Updated {when}")
  })
})
