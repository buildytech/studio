import { describe, expect, test } from "bun:test"
import { languageIdForPath, languageSupportForPath } from "./languages"

describe("languageIdForPath", () => {
  test("maps common web extensions to a language id", () => {
    const cases: Array<[string, import("./languages").EditorLanguage]> = [
      ["src/App.tsx", "tsx"],
      ["lib/util.ts", "typescript"],
      ["index.js", "javascript"],
      ["styles.css", "css"],
      ["page.html", "html"],
      ["templates/home.latte", "html"],
      ["templates/home.twig", "html"],
      ["package.json", "json"],
      ["README.md", "markdown"],
      ["docs/guide.mdx", "markdown"],
      ["content/home.mdc", "markdown"],
      ["script.py", "python"],
      ["compose.yaml", "yaml"],
    ]
    for (const [path, id] of cases) {
      expect(languageIdForPath(path), path).toBe(id)
    }
  })

  test("maps go, svelte, templ, shell, env and conf by name and extension", () => {
    const cases: Array<[string, import("./languages").EditorLanguage]> = [
      ["cmd/site/main.go", "go"],
      ["internal/Host.go", "go"],
      ["src/Widget.svelte", "svelte"],
      ["pages/home.templ", "templ"],
      ["scripts/setup.sh", "shell"],
      ["bin/run.bash", "shell"],
      ["hooks/pre-commit.zsh", "shell"],
      [".env", "env"],
      [".env.local", "env"],
      [".env.production", "env"],
      ["config/.env.example", "env"],
      ["deploy/app.env", "env"],
      ["nginx.conf", "conf"],
      ["config.ini", "conf"],
      ["limits.cfg", "conf"],
    ]
    for (const [path, id] of cases) {
      expect(languageIdForPath(path), path).toBe(id)
    }
  })

  test("unknown extensions and Dockerfile stay plain", () => {
    expect(languageIdForPath("notes.txt")).toBe("plain")
    expect(languageIdForPath("Dockerfile")).toBe("plain")
    expect(languageIdForPath("Makefile")).toBe("plain")
  })
})

describe("languageSupportForPath", () => {
  test("known languages return a language pack, plain returns none", () => {
    for (const path of [
      "main.go",
      "App.svelte",
      "home.templ",
      "run.sh",
      ".env",
      ".env.local",
      "nginx.conf",
      "page.mdc",
      "index.js",
      "package.json",
      "styles.css",
      "README.md",
    ]) {
      const ext = languageSupportForPath(path)
      const isEmptyArray = Array.isArray(ext) && ext.length === 0
      expect(isEmptyArray, path).toBe(false)
    }
    const plain = languageSupportForPath("notes.txt")
    expect(Array.isArray(plain) && plain.length === 0).toBe(true)
  })
})
