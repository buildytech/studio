/**
 * Client-side attach of live thinking/tool rows (+ optional todos) onto a
 * server chat bundle. Checksum algorithm must match
 * packages/host-core/src/agent/chat-bundle.ts.
 */

import type { AgentTodoItem } from "@buildy/agent-contract"
import type { CachedChatMessage } from "../chat-store"

export type ChatBundleTraceRow = {
  role: "thinking" | "tool"
  text: string
  runId?: string
  meta?: {
    durationMs?: number
    toolStatus?: "running" | "done" | "error" | "cancelled"
    tool?: string
    detail?: string
  }
}

export type ExportableChatBundle = {
  format: "buildy.chat.v1"
  exportedAt: string
  projectId: string
  session: {
    id: string
    title?: string | null
    runtime: string
  }
  messages: Array<{
    role: "user" | "assistant"
    text: string
    createdAt: string
    seq?: number
    runId?: string | null
  }>
  trace?: ChatBundleTraceRow[]
  /** Latest sticky agent todo list at export time (UI snapshot). */
  todos?: AgentTodoItem[]
  checksum: string
}

/** Collect finished thinking/tool rows from the open Studio tab. */
export function traceFromUiMessages(
  messages: CachedChatMessage[],
): ChatBundleTraceRow[] {
  const out: ChatBundleTraceRow[] = []
  for (const m of messages) {
    if (m.role !== "thinking" && m.role !== "tool") continue
    // Skip in-flight rows — export should be stable.
    if (m.streaming) continue
    if (m.role === "tool" && m.meta?.toolStatus === "running") continue
    const row: ChatBundleTraceRow = {
      role: m.role,
      text: m.text,
    }
    if (m.runId) row.runId = m.runId
    if (
      m.meta
      && (
        m.meta.durationMs !== undefined
        || m.meta.toolStatus
        || m.meta.tool
        || m.meta.detail
      )
    ) {
      row.meta = {}
      if (m.meta.durationMs !== undefined) row.meta.durationMs = m.meta.durationMs
      if (m.meta.toolStatus) row.meta.toolStatus = m.meta.toolStatus
      if (m.meta.tool) row.meta.tool = m.meta.tool
      if (m.meta.detail) row.meta.detail = m.meta.detail
    }
    out.push(row)
  }
  return out
}

function payloadForChecksum(
  bundle: Omit<ExportableChatBundle, "checksum">,
): string {
  const payload: Record<string, unknown> = {
    format: bundle.format,
    exportedAt: bundle.exportedAt,
    projectId: bundle.projectId,
    session: bundle.session,
    messages: bundle.messages,
  }
  if (bundle.trace !== undefined) payload.trace = bundle.trace
  if (bundle.todos !== undefined) payload.todos = bundle.todos
  return JSON.stringify(payload)
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function chatBundleChecksum(
  bundle: Omit<ExportableChatBundle, "checksum">,
): Promise<string> {
  const hex = await sha256Hex(payloadForChecksum(bundle))
  return `sha256:${hex}`
}

/** Re-sign a server export with optional UI trace / todos snapshots. */
export async function withExportExtras(
  bundle: ExportableChatBundle,
  extras: {
    trace?: ChatBundleTraceRow[]
    todos?: AgentTodoItem[]
  },
): Promise<ExportableChatBundle> {
  const { checksum: _ignored, ...rest } = bundle
  const draft: Omit<ExportableChatBundle, "checksum"> = { ...rest }
  if (extras.trace !== undefined) draft.trace = extras.trace
  if (extras.todos !== undefined) draft.todos = extras.todos
  return { ...draft, checksum: await chatBundleChecksum(draft) }
}

/** @deprecated Prefer withExportExtras — kept for older call sites / tests. */
export async function withExportTrace(
  bundle: ExportableChatBundle,
  trace: ChatBundleTraceRow[],
): Promise<ExportableChatBundle> {
  return withExportExtras(bundle, { trace })
}
