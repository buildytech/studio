import type { JSX } from "solid-js"

/**
 * Exceptions zone (ADR 0006): the preview <iframe>. UI8Kit has no frame primitive; this is the only one in the Studio.
 * Cross-origin preview needs explicit Permissions-Policy delegation, or the Clipboard API (spreadsheet paste/copy)
 * is blocked inside the app.
 */
export function PreviewFrame(props: {
  title: string
  class?: string
  ref: (el: HTMLIFrameElement) => void
  onLoad: () => void
}): JSX.Element {
  return (
    <iframe
      ref={props.ref}
      title={props.title}
      class={props.class}
      allow="clipboard-read *; clipboard-write *"
      onLoad={() => props.onLoad()}
    />
  )
}
