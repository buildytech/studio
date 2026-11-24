import { EMPTY_AGENT_TITLE, chatTitle } from "../chat-store"
import type { AgentSession } from "../api"

let messageSeq = 0

export function nextMessageId(prefix: string): string {
  messageSeq += 1
  return `${prefix}-${messageSeq}`
}

function isEmptyAgentTitle(title: string): boolean {
  const t = title.trim()
  return !t || t === EMPTY_AGENT_TITLE || t === "New chat" || t === "New Chat"
}

export function shortSessionLabel(
  session: AgentSession,
  userId: string,
  projectId: string,
): string {
  if (session.title?.trim()) return session.title.trim()
  const cached = chatTitle(userId, projectId, session.id)
  if (!isEmptyAgentTitle(cached)) return cached
  const stamp = new Date(session.createdAt)
  if (!Number.isNaN(stamp.getTime())) {
    return `Agent ${stamp.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`
  }
  return EMPTY_AGENT_TITLE
}

/**
 * Runtime badge label. The server names the runtime via
 * capabilities.runtimeLabel — the UI never compares the runtime id against
 * string literals (E0 web gate enforces this in CI).
 */
export function formatRuntimeLabel(
  runtimeLabel: string | undefined,
  runtime?: string,
): string {
  return runtimeLabel ?? runtime ?? "Agent"
}

export function formatTokenCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k`
  return String(n)
}

/** USD cost from runtimes that report it (Pi). Never invent rates for Cursor. */
export function formatUsdCost(n: number): string {
  if (!Number.isFinite(n) || n < 0) return ""
  if (n === 0) return "$0"
  if (n < 0.01) return `$${n.toFixed(4)}`
  if (n < 1) return `$${n.toFixed(3)}`
  return `$${n.toFixed(2)}`
}

export type UsageDisplay = {
  tokensIn: number
  tokensOut: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  totalTokens?: number
  costUsd?: number
}

/** Compact toolbar line: `12.4k → 1.2k · $0.04` + cache in title. */
export function formatUsageLine(u: UsageDisplay): string {
  const tokens = `${formatTokenCount(u.tokensIn)} → ${formatTokenCount(u.tokensOut)}`
  const cost =
    u.costUsd !== undefined && Number.isFinite(u.costUsd)
      ? formatUsdCost(u.costUsd)
      : ""
  return cost ? `${tokens} · ${cost}` : tokens
}

export function formatUsageTitle(u: UsageDisplay): string {
  const parts = [
    `in ${u.tokensIn.toLocaleString()} / out ${u.tokensOut.toLocaleString()}`,
  ]
  if (u.cacheReadTokens) {
    parts.push(`cache read ${u.cacheReadTokens.toLocaleString()}`)
  }
  if (u.cacheWriteTokens) {
    parts.push(`cache write ${u.cacheWriteTokens.toLocaleString()}`)
  }
  if (u.reasoningTokens) {
    parts.push(`reasoning ${u.reasoningTokens.toLocaleString()}`)
  }
  if (u.totalTokens) {
    parts.push(`total ${u.totalTokens.toLocaleString()}`)
  }
  if (u.costUsd !== undefined && Number.isFinite(u.costUsd)) {
    parts.push(`cost ${formatUsdCost(u.costUsd)}`)
  }
  return parts.join(" · ")
}
