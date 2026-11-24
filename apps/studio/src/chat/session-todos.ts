/**
 * Session-scoped sticky todos from Cursor updateTodos (browser only).
 * Not server SSoT — survives reload via sessionStorage; included in export.
 */

import type { AgentTodoItem } from "@buildy/agent-contract"

const PREFIX = "buildy.chat.todos.v1."

export function sessionTodosKey(
  userId: string,
  projectId: string,
  sessionId: string,
): string {
  return `${PREFIX}${userId}.${projectId}.${sessionId}`
}

export function loadSessionTodos(
  userId: string,
  projectId: string,
  sessionId: string,
): AgentTodoItem[] {
  try {
    const raw = sessionStorage.getItem(
      sessionTodosKey(userId, projectId, sessionId),
    )
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    const out: AgentTodoItem[] = []
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue
      const rec = item as Record<string, unknown>
      const content =
        typeof rec.content === "string" ? rec.content.trim() : ""
      const status = rec.status
      if (
        !content
        || (
          status !== "pending"
          && status !== "inProgress"
          && status !== "completed"
          && status !== "cancelled"
        )
      ) {
        continue
      }
      out.push({ content, status })
    }
    return out
  } catch {
    return []
  }
}

export function saveSessionTodos(
  userId: string,
  projectId: string,
  sessionId: string,
  todos: AgentTodoItem[],
): void {
  try {
    const key = sessionTodosKey(userId, projectId, sessionId)
    if (todos.length === 0) {
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, JSON.stringify(todos))
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearSessionTodos(
  userId: string,
  projectId: string,
  sessionId: string,
): void {
  try {
    sessionStorage.removeItem(sessionTodosKey(userId, projectId, sessionId))
  } catch {
    /* ignore */
  }
}

export function todosProgress(todos: AgentTodoItem[]): {
  done: number
  total: number
  active: number
} {
  const total = todos.length
  const done = todos.filter((t) => t.status === "completed").length
  const active = todos.filter((t) => t.status === "inProgress").length
  return { done, total, active }
}
