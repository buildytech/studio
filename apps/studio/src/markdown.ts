/**
 * Render LLM markdown to safe HTML for chat bubbles.
 * marked → GFM (tables, fenced code); DOMPurify strips scripts/handlers.
 * Mermaid fences hydrate separately via hydrateMermaid (strict, soft-fail).
 */

import createDOMPurify from "dompurify"
import { Marked } from "marked"

type Purify = {
  sanitize: (
    dirty: string,
    cfg?: { USE_PROFILES?: { html?: boolean } },
  ) => string
  addHook: (entry: string, hook: (node: Element) => void) => void
}

let purify: Purify | null = null
let mermaidInit: Promise<typeof import("mermaid").default> | null = null

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

/** Mermaid strict mode rejects HTML labels; keep line breaks as text. */
export function normalizeMermaidSource(source: string): string {
  return source.replace(/<br\s*\/?>/gi, "\n")
}

const marked = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    code({ text, lang }) {
      const language = (lang ?? "").trim().toLowerCase()
      if (language === "mermaid") {
        const body = escapeHtml(normalizeMermaidSource(text))
        return `<pre class="mermaid">${body}</pre>\n`
      }
      const info = language ? ` class="language-${escapeHtml(language)}"` : ""
      return `<pre><code${info}>${escapeHtml(text)}</code></pre>\n`
    },
  },
})

function getPurify(): Purify {
  if (purify) return purify
  const win = globalThis.window
  if (!win) {
    throw new Error("renderMarkdown requires a DOM (window)")
  }

  const factory = createDOMPurify as unknown as (window: Window) => Purify
  const instance =
    typeof factory === "function"
      ? factory(win)
      : (createDOMPurify as unknown as Purify)

  if (typeof instance?.sanitize !== "function") {
    throw new Error("DOMPurify.sanitize unavailable")
  }

  if (typeof instance.addHook === "function") {
    instance.addHook("afterSanitizeAttributes", (node) => {
      if (node instanceof HTMLAnchorElement) {
        node.setAttribute("target", "_blank")
        node.setAttribute("rel", "noopener noreferrer")
      }
    })
  }

  purify = instance
  return instance
}

export function renderMarkdown(source: string): string {
  if (!source) return ""
  const html = marked.parse(source, { async: false }) as string
  return getPurify().sanitize(html, {
    USE_PROFILES: { html: true },
  })
}

async function loadMermaid(): Promise<typeof import("mermaid").default> {
  if (!mermaidInit) {
    mermaidInit = import("mermaid").then((mod) => {
      const api = mod.default
      api.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "neutral",
        fontFamily: "inherit",
      })
      return api
    })
  }
  return mermaidInit
}

/**
 * Turn sanitized `pre.mermaid` fences into SVG diagrams.
 * Soft-fails: bad syntax keeps the source text (or Mermaid’s error node).
 */
export async function hydrateMermaid(
  root: ParentNode,
  deps: { load?: () => Promise<typeof import("mermaid").default> } = {},
): Promise<void> {
  const nodes = [...root.querySelectorAll("pre.mermaid")].filter(
    (node): node is HTMLElement =>
      node instanceof HTMLElement && node.dataset.mermaidDone !== "1",
  )
  if (nodes.length === 0) return

  try {
    const api = await (deps.load ?? loadMermaid)()
    for (const node of nodes) {
      node.dataset.mermaidDone = "1"
    }
    await api.run({ nodes })
  } catch {
    for (const node of nodes) {
      node.classList.add("mermaid-error")
      node.dataset.mermaidDone = "error"
    }
  }
}
