import type { ToolCall } from "./model"

/**
 * Renderer registry (ADR 0005). A renderer says which calls it draws and
 * carries its view; adding a tool means registering one more renderer, not
 * editing the list or the ToolCall composite (Open/Closed).
 */
export type ToolRenderer<V> = {
  id: string
  matches: (call: ToolCall) => boolean
  view: V
}

export class ToolRendererRegistry<V> {
  readonly #renderers: ToolRenderer<V>[] = []

  constructor(readonly fallback: ToolRenderer<V>) {}

  /** Later registrations win, so an app can override a built-in renderer. */
  register(renderer: ToolRenderer<V>): this {
    this.#renderers.unshift(renderer)
    return this
  }

  resolve(call: ToolCall): ToolRenderer<V> {
    return this.#renderers.find((r) => r.matches(call)) ?? this.fallback
  }
}

const tools = (...names: string[]) => (call: ToolCall) => names.includes(call.tool.toLowerCase())

/** Built-in matchers, shared by the desktop and cloud views. */
export const toolMatchers = {
  shell: (call: ToolCall) => call.kind === "shell" || tools("shell", "bash", "terminal")(call),
  edit: (call: ToolCall) => tools("edit", "write", "patch", "apply_patch", "delete")(call) || isUnifiedDiff(call.output),
  read: tools("read", "read_file", "view"),
  search: (call: ToolCall) => call.kind === "search" || tools("grep", "glob", "search", "ls", "find")(call),
  preview: tools("preview", "screenshot"),
} as const

export type DiffLine = { type: "add" | "del" | "ctx" | "hunk" | "meta"; text: string }

export function isUnifiedDiff(text: string): boolean {
  return /^--- .*\n\+\+\+ .*\n@@ /m.test(text)
}

/** Line classes for the edit renderer; the text is shown as is. */
export function parseUnifiedDiff(text: string): DiffLine[] {
  return text.split("\n").map((line): DiffLine => {
    if (line.startsWith("+++") || line.startsWith("---")) return { type: "meta", text: line }
    if (line.startsWith("@@")) return { type: "hunk", text: line }
    if (line.startsWith("+")) return { type: "add", text: line.slice(1) }
    if (line.startsWith("-")) return { type: "del", text: line.slice(1) }
    return { type: "ctx", text: line.startsWith(" ") ? line.slice(1) : line }
  })
}

export function diffStats(lines: readonly DiffLine[]): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const l of lines) {
    if (l.type === "add") added += 1
    else if (l.type === "del") removed += 1
  }
  return { added, removed }
}
