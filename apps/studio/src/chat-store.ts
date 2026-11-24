/**
 * Browser-side chat render cache (Cursor-like tabs).
 * The server transcript (agent_messages, E1) is the source of truth and wins
 * on session open; this cache makes tab switching instant and keeps the last
 * known history visible when the API is unreachable.
 *
 * Keys are namespaced by authenticated userId (Slice A) so account switches
 * cannot read another tenant's plaintext prompts.
 */

export type CachedChatMessage = {
  id: string
  role: "user" | "assistant" | "system" | "thinking" | "tool"
  text: string
  streaming?: boolean
  /** Filename of an attached image (no bytes — cache stays small). */
  attachmentName?: string
  /** agent_runs id for 👍/👎 feedback (E1). */
  runId?: string
  /** Latched rating (server SoT via transcript hydrate; cache mirrors it). */
  feedback?: "up" | "down"
  /** thinking duration / tool run state for compact live-trace rows. */
  meta?: {
    durationMs?: number
    toolStatus?: "running" | "done" | "error" | "cancelled"
    /** The head of `detail` was dropped to keep the last TOOL_OUTPUT_MAX characters. */
    truncated?: boolean
    /** Tool name (shell, webSearch, task, …) — header shows command in `text`. */
    tool?: string
    /** Coarse kind for badge: shell | search | agent | file | mcp | tool. */
    kind?: string
    callId?: string
    /** Scrollable terminal body (stdout / meta). */
    detail?: string
  }
}

export const FEEDBACK_DOWN_TAGS = [
  "wrong",
  "slow",
  "style",
  "scope",
  "incomplete",
] as const

export type FeedbackDownTag = (typeof FEEDBACK_DOWN_TAGS)[number]

export type CachedChat = {
  title: string
  messages: CachedChatMessage[]
  updatedAt: number
}

const PREFIX_CHAT = "buildy.chat.v2."
const PREFIX_ACTIVE = "buildy.chat.active.v2."
const PREFIX_GROK = "buildy.chat.grok.v2."
const PREFIX_OPUS = "buildy.chat.opus.v1."
const PREFIX_MODEL = "buildy.chat.model.v2."
/** Empty tab / cache title (Cursor IDE: New Agent). */
export const EMPTY_AGENT_TITLE = "New Agent"
/** Pre-Slice-A keys without userId — always purged on login/logout. */
const LEGACY_PREFIXES = [
  "buildy.chat.v1.",
  "buildy.chat.active.v1.",
  "buildy.chat.grok.v1",
  "buildy.chat.model.v1.",
] as const

function chatKey(userId: string, projectId: string, sessionId: string): string {
  return `${PREFIX_CHAT}${userId}.${projectId}.${sessionId}`
}

function activeKey(userId: string, projectId: string): string {
  return `${PREFIX_ACTIVE}${userId}.${projectId}`
}

export function grokOptsKey(userId: string): string {
  return `${PREFIX_GROK}${userId}`
}

export function opusOptsKey(userId: string): string {
  return `${PREFIX_OPUS}${userId}`
}

export function modelIdKey(userId: string): string {
  return `${PREFIX_MODEL}${userId}`
}

/** Last model picker selection (persists across Studio reload). */
export function loadModelId(userId: string): string | null {
  try {
    const raw = localStorage.getItem(modelIdKey(userId))?.trim()
    return raw || null
  } catch {
    return null
  }
}

export function saveModelId(userId: string, modelId: string): void {
  try {
    const id = modelId.trim()
    if (!id) return
    localStorage.setItem(modelIdKey(userId), id)
  } catch {
    /* ignore */
  }
}

function isTranscriptRole(role: CachedChatMessage["role"]): boolean {
  return role === "user" || role === "assistant"
}

/** Persist only durable transcript roles (not thinking/tool traces). */
export function messagesForCache(
  messages: CachedChatMessage[],
): CachedChatMessage[] {
  return messages
    .filter((m) => isTranscriptRole(m.role))
    .map((m) => ({ ...m, streaming: false }))
}

function titleFromMessages(messages: CachedChatMessage[]): string {
  const first = messages.find((m) => m.role === "user" && m.text.trim())
  if (!first) return EMPTY_AGENT_TITLE
  const oneLine = first.text.trim().replace(/\s+/g, " ")
  return oneLine.length > 42 ? `${oneLine.slice(0, 41)}…` : oneLine
}

export function loadChat(
  userId: string,
  projectId: string,
  sessionId: string,
): CachedChat {
  try {
    const raw = localStorage.getItem(chatKey(userId, projectId, sessionId))
    if (!raw) return { title: EMPTY_AGENT_TITLE, messages: [], updatedAt: 0 }
    const parsed = JSON.parse(raw) as CachedChat
    const messages = messagesForCache(parsed.messages ?? [])
    const title = normalizeAgentTitle(parsed.title || titleFromMessages(messages))
    return {
      title,
      messages,
      updatedAt: parsed.updatedAt ?? 0,
    }
  } catch {
    return { title: EMPTY_AGENT_TITLE, messages: [], updatedAt: 0 }
  }
}

/** Map legacy empty-tab titles from older Studio builds. */
function normalizeAgentTitle(title: string): string {
  const t = title.trim()
  if (!t || t === "New chat" || t === "New Chat") return EMPTY_AGENT_TITLE
  return title
}

export function saveChat(
  userId: string,
  projectId: string,
  sessionId: string,
  messages: CachedChatMessage[],
): CachedChat {
  const persisted = messagesForCache(messages)
  const chat: CachedChat = {
    title: titleFromMessages(persisted),
    messages: persisted,
    updatedAt: Date.now(),
  }
  try {
    localStorage.setItem(
      chatKey(userId, projectId, sessionId),
      JSON.stringify(chat),
    )
  } catch {
    /* quota / private mode */
  }
  return chat
}

export function chatTitle(
  userId: string,
  projectId: string,
  sessionId: string,
): string {
  return loadChat(userId, projectId, sessionId).title
}

/** True when the browser cache has at least one non-empty user/assistant turn. */
export function hasChatHistory(
  userId: string,
  projectId: string,
  sessionId: string,
): boolean {
  return loadChat(userId, projectId, sessionId).messages.some(
    (m) => isTranscriptRole(m.role) && m.text.trim(),
  )
}

export function getActiveSessionId(
  userId: string,
  projectId: string,
): string | null {
  try {
    return localStorage.getItem(activeKey(userId, projectId))
  } catch {
    return null
  }
}

export function setActiveSessionId(
  userId: string,
  projectId: string,
  sessionId: string,
): void {
  try {
    localStorage.setItem(activeKey(userId, projectId), sessionId)
  } catch {
    /* ignore */
  }
}

export function removeChatCache(
  userId: string,
  projectId: string,
  sessionId: string,
): void {
  try {
    localStorage.removeItem(chatKey(userId, projectId, sessionId))
  } catch {
    /* ignore */
  }
}

function isChatStorageKey(key: string): boolean {
  if (
    key.startsWith(PREFIX_CHAT)
    || key.startsWith(PREFIX_ACTIVE)
    || key.startsWith(PREFIX_GROK)
    || key.startsWith(PREFIX_OPUS)
    || key.startsWith(PREFIX_MODEL)
  ) {
    return true
  }
  for (const legacy of LEGACY_PREFIXES) {
    if (key === legacy || key.startsWith(legacy)) return true
  }
  return false
}

/** Clear all Studio chat render caches (login / logout / session hygiene). */
export function purgeAllChatCache(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && isChatStorageKey(key)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}
