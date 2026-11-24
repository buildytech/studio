import { describe, expect, test } from "bun:test"
import { languageSupportForPath } from "./languages"

describe("languageSupportForPath", () => {
  test("maps common web extensions to a language support facet", () => {
    for (const path of [
      "src/App.tsx",
      "lib/util.ts",
      "index.js",
      "styles.css",
      "page.html",
      "templates/home.latte",
      "templates/home.twig",
      "package.json",
      "README.md",
      "script.py",
      "compose.yaml",
    ]) {
      const ext = languageSupportForPath(path)
      // LanguageSupport / Extension arrays are truthy objects; plain [] is empty.
      const isEmptyArray = Array.isArray(ext) && ext.length === 0
      expect(isEmptyArray).toBe(false)
    }
  })

  test("unknown extensions return no language pack", () => {
    const ext = languageSupportForPath("notes.txt")
    expect(Array.isArray(ext) && ext.length === 0).toBe(true)
  })
})
