/**
 * Session list helpers for Chat bootstrap: prune phantom empty tabs and
 * create-at-most-one draft without racing concurrent mounts.
 */

import {
  hasChatHistory,
  removeChatCache,
} from "../chat-store"
import { api, type AgentSession } from "../api"

const ensureSessionInflight = new Map<string, Promise<AgentSession>>()

/**
 * Keep chats with local history + at most one empty tab (active/newest).
 * Extra empty server rows are deleted so reload does not resurrect phantoms.
 */
export async function selectVisibleSessions(
  userId: string,
  projectId: string,
  listed: AgentSession[],
  preferredId: string | null,
): Promise<AgentSession[]> {
  const withHistory: AgentSession[] = []
  const empty: AgentSession[] = []
  for (const s of listed) {
    if (hasChatHistory(userId, projectId, s.id)) withHistory.push(s)
    else empty.push(s)
  }

  const keepEmpty =
    empty.find((s) => s.id === preferredId)
    ?? empty[0]
    ?? null
  const drop = empty.filter((s) => s.id !== keepEmpty?.id)

  await Promise.all(
    drop.map(async (s) => {
      removeChatCache(userId, projectId, s.id)
      try {
        await api.deleteAgentSession(projectId, s.id)
      } catch {
        /* already gone or busy — still hide from UI */
      }
    }),
  )

  const visible = keepEmpty ? [...withHistory, keepEmpty] : [...withHistory]
  visible.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )
  return visible
}

export async function ensureRuntimeSession(
  projectId: string,
  listed: AgentSession[],
): Promise<AgentSession[]> {
  if (listed.length > 0) return listed
  const existing = ensureSessionInflight.get(projectId)
  if (existing) return [await existing]
  const pending = api
    .createAgentSession(projectId)
    .then((r) => r.session)
    .finally(() => {
      ensureSessionInflight.delete(projectId)
    })
  ensureSessionInflight.set(projectId, pending)
  return [await pending]
}
