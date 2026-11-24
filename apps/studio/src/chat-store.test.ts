import { afterEach, describe, expect, test } from "bun:test"
import {
  hasChatHistory,
  loadChat,
  loadModelId,
  messagesForCache,
  purgeAllChatCache,
  saveChat,
  saveModelId,
} from "./chat-store"

const memory = new Map<string, string>()

function installLocalStorageMock() {
  memory.clear()
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return memory.size
      },
      key(i: number) {
        return [...memory.keys()][i] ?? null
      },
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

afterEach(() => {
  memory.clear()
})

describe("chat-store Slice A isolation", () => {
  test("Alice cache is invisible to Bob", () => {
    installLocalStorageMock()
    const alice = "user-alice"
    const bob = "user-bob"
    const project = "proj-1"
    const session = "sess-1"

    saveChat(alice, project, session, [
      { id: "1", role: "user", text: "secret from alice" },
      { id: "2", role: "assistant", text: "ok" },
    ])

    expect(hasChatHistory(alice, project, session)).toBe(true)
    expect(hasChatHistory(bob, project, session)).toBe(false)
    expect(loadChat(bob, project, session).messages).toEqual([])
  })

  test("saveChat drops thinking/tool roles", () => {
    installLocalStorageMock()
    const persisted = messagesForCache([
      { id: "1", role: "user", text: "hi" },
      { id: "2", role: "thinking", text: "plan" },
      { id: "3", role: "tool", text: "edit", meta: { toolStatus: "done" } },
      { id: "4", role: "assistant", text: "done", streaming: true },
    ])
    expect(persisted.map((m) => m.role)).toEqual(["user", "assistant"])
    expect(persisted[1]?.streaming).toBe(false)

    saveChat("u1", "p1", "s1", [
      { id: "1", role: "user", text: "hi" },
      { id: "2", role: "thinking", text: "plan" },
      { id: "4", role: "assistant", text: "done" },
    ])
    const loaded = loadChat("u1", "p1", "s1")
    expect(loaded.messages.map((m) => m.role)).toEqual(["user", "assistant"])
  })

  test("loadModelId / saveModelId round-trip", () => {
    installLocalStorageMock()
    expect(loadModelId("u1")).toBe(null)
    saveModelId("u1", "cursor/composer-2.5-fast")
    expect(loadModelId("u1")).toBe("cursor/composer-2.5-fast")
    expect(loadModelId("u2")).toBe(null)
  })

  test("legacy New chat title normalizes to New Agent", () => {
    installLocalStorageMock()
    memory.set(
      "buildy.chat.v2.u1.p1.s1",
      JSON.stringify({
        title: "New chat",
        messages: [],
        updatedAt: 1,
      }),
    )
    expect(loadChat("u1", "p1", "s1").title).toBe("New Agent")
  })

  test("purgeAllChatCache clears v2 and legacy keys", () => {
    installLocalStorageMock()
    memory.set("buildy.chat.v1.p.s", "{}")
    memory.set("buildy.chat.v2.u.p.s", "{}")
    memory.set("buildy.chat.active.v2.u.p", "s")
    memory.set("unrelated", "keep")
    purgeAllChatCache()
    expect(memory.has("buildy.chat.v1.p.s")).toBe(false)
    expect(memory.has("buildy.chat.v2.u.p.s")).toBe(false)
    expect(memory.has("buildy.chat.active.v2.u.p")).toBe(false)
    expect(memory.get("unrelated")).toBe("keep")
  })
})
