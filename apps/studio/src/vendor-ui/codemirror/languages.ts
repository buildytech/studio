import { css } from "@codemirror/lang-css"
import { go } from "@codemirror/lang-go"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { yaml } from "@codemirror/lang-yaml"
import { StreamLanguage } from "@codemirror/language"
import type { Extension } from "@codemirror/state"
import { properties } from "@codemirror/legacy-modes/mode/properties"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { svelte } from "@replit/codemirror-lang-svelte"
import { templLanguage } from "./templ-language"

/** Language id chosen for a workspace path (tests assert this mapping). */
export type EditorLanguage =
  | "typescript"
  | "tsx"
  | "javascript"
  | "jsx"
  | "json"
  | "css"
  | "html"
  | "markdown"
  | "python"
  | "yaml"
  | "go"
  | "svelte"
  | "templ"
  | "shell"
  | "env"
  | "conf"
  | "plain"

const iniLang = StreamLanguage.define(properties)
const shellLang = StreamLanguage.define(shell)

function fileName(filePath: string): string {
  return (filePath.split(/[/\\]/).pop() ?? "").toLowerCase()
}

/** `.env`, `.env.local`, `.env.production`, `app.env`. */
export function isEnvFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return lower === ".env" || lower.startsWith(".env.") || lower.endsWith(".env")
}

/** Map a workspace-relative path to a language id by file name and extension. */
export function languageIdForPath(filePath: string): EditorLanguage {
  const lower = fileName(filePath)
  if (
    lower === "dockerfile"
    || lower.startsWith("dockerfile.")
    || lower === "makefile"
    || lower === "cmakelists.txt"
  ) {
    return "plain"
  }
  if (isEnvFileName(lower)) return "env"

  const dot = lower.lastIndexOf(".")
  const ext = dot >= 0 ? lower.slice(dot + 1) : ""
  switch (ext) {
    case "ts":
    case "mts":
    case "cts":
      return "typescript"
    case "tsx":
      return "tsx"
    case "js":
    case "mjs":
    case "cjs":
      return "javascript"
    case "jsx":
      return "jsx"
    case "json":
    case "jsonc":
      return "json"
    case "css":
    case "scss":
    case "less":
      return "css"
    case "html":
    case "htm":
    case "svg":
    case "latte":
    case "twig":
      return "html"
    case "md":
    case "mdx":
    case "mdc":
    case "markdown":
      return "markdown"
    case "py":
      return "python"
    case "yml":
    case "yaml":
      return "yaml"
    case "go":
      return "go"
    case "svelte":
      return "svelte"
    case "templ":
      return "templ"
    case "sh":
    case "bash":
    case "zsh":
      return "shell"
    case "conf":
    case "ini":
    case "cfg":
      return "conf"
    default:
      return "plain"
  }
}

/** Map a workspace-relative path to a CodeMirror language extension. */
export function languageSupportForPath(filePath: string): Extension {
  switch (languageIdForPath(filePath)) {
    case "typescript":
      return javascript({ typescript: true })
    case "tsx":
      return javascript({ typescript: true, jsx: true })
    case "javascript":
      return javascript()
    case "jsx":
      return javascript({ jsx: true })
    case "json":
      return json()
    case "css":
      return css()
    case "html":
      return html()
    case "markdown":
      return markdown()
    case "python":
      return python()
    case "yaml":
      return yaml()
    case "go":
      return go()
    case "svelte":
      return svelte()
    case "templ":
      return templLanguage()
    case "shell":
      return shellLang
    case "env":
    case "conf":
      return iniLang
    default:
      return []
  }
}
