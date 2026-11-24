import { describe, expect, test } from "bun:test"
import {
  loadSessionTodos,
  saveSessionTodos,
  sessionTodosKey,
  todosProgress,
} from "./session-todos"
import { withExportExtras, type ExportableChatBundle } from "./export-trace"

const memory = new Map<string, string>()

function installSessionStorageMock() {
  memory.clear()
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem(k: string) {
        return memory.get(k) ?? null
      },
      setItem(k: string, v: string) {
        memory.set(k, v)
      },
      removeItem(k: string) {
        memory.delete(k)
      },
      clear() {
        memory.clear()
      },
    },
  })
}

describe("session-todos", () => {
  test("round-trip via sessionStorage", () => {
    installSessionStorageMock()
    const userId = "u-todos"
    const projectId = "p-todos"
    const sessionId = "s-todos"
    sessionStorage.removeItem(sessionTodosKey(userId, projectId, sessionId))
    saveSessionTodos(userId, projectId, sessionId, [
      { content: "A", status: "completed" },
      { content: "B", status: "inProgress" },
    ])
    expect(loadSessionTodos(userId, projectId, sessionId)).toEqual([
      { content: "A", status: "completed" },
      { content: "B", status: "inProgress" },
    ])
    expect(todosProgress(loadSessionTodos(userId, projectId, sessionId))).toEqual({
      done: 1,
      total: 2,
      active: 1,
    })
  })
})

describe("withExportExtras", () => {
  test("adds todos and re-signs checksum", async () => {
    const base: ExportableChatBundle = {
      format: "buildy.chat.v1",
      exportedAt: "2026-07-25T00:00:00.000Z",
      projectId: "p1",
      session: { id: "s1", runtime: "cursor-sdk" },
      messages: [
        {
          role: "user",
          text: "hi",
          createdAt: "2026-07-25T00:00:00.000Z",
        },
      ],
      checksum: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }
    const next = await withExportExtras(base, {
      todos: [{ content: "Ship store", status: "pending" }],
    })
    expect(next.todos).toEqual([{ content: "Ship store", status: "pending" }])
    expect(next.checksum.startsWith("sha256:")).toBe(true)
    expect(next.checksum).not.toBe(base.checksum)
  })
})
