import type { CachedChatMessage } from "../../chat-store"
import { groupToolCalls, type ToolCall } from "./model"

/**
 * The chat keeps tool calls as rows of its message list (cached and exported with the conversation). These two
 * mappings are the only bridge between those rows and the tool-call model (ADR 0005).
 */
export function callToRow(call: ToolCall, id: string): CachedChatMessage {
  return {
    id,
    role: "tool",
    text: call.summary,
    streaming: call.status === "running",
    ...(call.runId ? { runId: call.runId } : {}),
    meta: {
      tool: call.tool,
      toolStatus: call.status,
      kind: call.kind,
      callId: call.id,
      ...(call.output ? { detail: call.output } : {}),
      ...(call.truncated ? { truncated: true } : {}),
    },
  }
}

export function rowToCall(row: CachedChatMessage): ToolCall {
  return {
    id: row.meta?.callId ?? row.id,
    tool: row.meta?.tool ?? "tool",
    kind: row.meta?.kind ?? "tool",
    status: row.meta?.toolStatus ?? (row.streaming ? "running" : "done"),
    summary: row.text,
    output: row.meta?.detail ?? "",
    truncated: Boolean(row.meta?.truncated),
    ...(row.runId ? { runId: row.runId } : {}),
  }
}

/** Replace the rows of calls that changed (matched by callId) and append rows for new calls. */
export function upsertToolRows(
  rows: readonly CachedChatMessage[],
  calls: readonly ToolCall[],
  newId: () => string,
): CachedChatMessage[] {
  const next = rows.slice()
  for (const call of calls) {
    let i = next.length - 1
    while (i >= 0 && !(next[i]!.role === "tool" && next[i]!.meta?.callId === call.id)) i -= 1
    if (i >= 0) next[i] = callToRow(call, next[i]!.id)
    else next.push(callToRow(call, newId()))
  }
  return next
}

/** Calls of `after` that are new or different from `before` (the reducer keeps unchanged calls by reference). */
export function changedCalls(before: readonly ToolCall[], after: readonly ToolCall[]): ToolCall[] {
  return after.filter((call, i) => before[i] !== call)
}

export type ChatItem =
  | { type: "message"; message: CachedChatMessage }
  | { type: "tools"; kind: string; rows: CachedChatMessage[] }

/**
 * The list the chat renders: messages, with runs of quiet tool calls of one kind folded into one item
 * (groupToolCalls). Items are cached so an unchanged message keeps its item object and its DOM.
 */
export function createChatItems(): (messages: readonly CachedChatMessage[]) => ChatItem[] {
  const singles = new WeakMap<CachedChatMessage, ChatItem>()
  let groups = new Map<string, ChatItem>()
  const single = (message: CachedChatMessage): ChatItem => {
    let item = singles.get(message)
    if (!item) singles.set(message, (item = { type: "message", message }))
    return item
  }
  return (messages) => {
    const out: ChatItem[] = []
    const nextGroups = new Map<string, ChatItem>()
    let run: CachedChatMessage[] = []
    const flush = () => {
      if (!run.length) return
      const byId = new Map(run.map((r) => [rowToCall(r).id, r]))
      for (const g of groupToolCalls(run.map(rowToCall))) {
        if (g.type === "single") {
          out.push(single(byId.get(g.call.id)!))
          continue
        }
        const rows = g.calls.map((c) => byId.get(c.id)!)
        const key = rows.map((r) => r.id).join(",")
        const prev = groups.get(key)
        const item = prev && prev.type === "tools" && prev.rows.every((r, i) => r === rows[i]) ? prev : { type: "tools" as const, kind: g.kind, rows }
        nextGroups.set(key, item)
        out.push(item)
      }
      run = []
    }
    for (const m of messages) {
      if (m.role === "tool") run.push(m)
      else {
        flush()
        out.push(single(m))
      }
    }
    flush()
    groups = nextGroups
    return out
  }
}

/** Items kept in the DOM; older ones wait behind "Show earlier" (ADR 0005, long chats). */
export const CHAT_RENDER_WINDOW = 200
