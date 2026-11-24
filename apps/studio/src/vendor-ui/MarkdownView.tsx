import { createEffect, type JSX } from "solid-js"
import { hydrateMermaid, renderMarkdown } from "./markdown"

/**
 * Vendor-wrapper zone (ADR 0004): the one host that writes HTML. The markup comes from marked and is sanitized by
 * DOMPurify in renderMarkdown; mermaid SVG is drawn after sanitizing.
 */
export function MarkdownView(props: { source: string; class?: string }): JSX.Element {
  let root: HTMLDivElement | undefined
  createEffect(() => {
    const text = props.source
    if (!root) return
    root.innerHTML = renderMarkdown(text)
    void hydrateMermaid(root)
  })
  return <div class={props.class} ref={(el) => { root = el }} />
}
