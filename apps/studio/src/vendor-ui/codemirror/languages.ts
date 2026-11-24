import { css } from "@codemirror/lang-css"
import { html } from "@codemirror/lang-html"
import { javascript } from "@codemirror/lang-javascript"
import { json } from "@codemirror/lang-json"
import { markdown } from "@codemirror/lang-markdown"
import { python } from "@codemirror/lang-python"
import { yaml } from "@codemirror/lang-yaml"
import type { Extension } from "@codemirror/state"

/** Map a workspace-relative path to a CodeMirror language extension. */
export function languageSupportForPath(filePath: string): Extension {
  const base = filePath.split(/[/\\]/).pop() ?? ""
  const dot = base.lastIndexOf(".")
  const ext = dot >= 0 ? base.slice(dot + 1).toLowerCase() : ""
  const lower = base.toLowerCase()

  if (
    lower === "dockerfile"
    || lower.startsWith("dockerfile.")
    || lower === "makefile"
    || lower === "cmakelists.txt"
  ) {
    return []
  }

  switch (ext) {
    case "ts":
    case "mts":
    case "cts":
      return javascript({ typescript: true })
    case "tsx":
      return javascript({ typescript: true, jsx: true })
    case "js":
    case "mjs":
    case "cjs":
      return javascript()
    case "jsx":
      return javascript({ jsx: true })
    case "json":
    case "jsonc":
      return json()
    case "css":
    case "scss":
    case "less":
      return css()
    case "html":
    case "htm":
    case "svg":
    case "latte":
    case "twig":
      return html()
    case "md":
    case "mdx":
    case "markdown":
      return markdown()
    case "py":
      return python()
    case "php":
      // No dedicated PHP grammar in Studio yet; plain text until lang-php lands.
      return []
    case "yml":
    case "yaml":
      return yaml()
    default:
      return []
  }
}
