import { describe, expect, test } from "bun:test"
import { AgentEventSchema, type AgentEvent } from "@buildy/agent-contract"
import probe from "./fixtures/sandbox-probe.json"
import type { CachedChatMessage } from "../../chat-store"
import { createToolState, reduceToolEvent } from "./model"
import { changedCalls, createChatItems, rowToCall, upsertToolRows } from "./rows"

describe("tool rows in the chat", () => {
  test("streaming the real run into chat rows: one row per call, updated in place, round-trips to calls", () => {
    let state = createToolState()
    let rows: CachedChatMessage[] = [{ id: "u1", role: "user", text: "do it" }]
    let n = 0
    for (const raw of probe.events) {
      const e = AgentEventSchema.parse(raw) as AgentEvent
      const next = reduceToolEvent(state, e)
      rows = upsertToolRows(rows, changedCalls(state.calls, next.calls), () => `t${++n}`)
      state = next
    }
    const tools = rows.filter((r) => r.role === "tool")
    expect(tools).toHaveLength(6)
    expect(tools.map((r) => r.id)).toEqual(["t1", "t2", "t3", "t4", "t5", "t6"])
    expect(tools.map((r) => r.meta?.toolStatus)).toEqual(["done", "error", "error", "error", "error", "error"])
    expect(tools.map(rowToCall)).toEqual(state.calls as never)
  })

  test("rows cached before the model still render as calls", () => {
    const call = rowToCall({ id: "x", role: "tool", text: "ls", meta: { tool: "shell", toolStatus: "done", detail: "a" } })
    expect(call).toMatchObject({ id: "x", tool: "shell", kind: "tool", status: "done", output: "a", truncated: false })
  })
})

describe("chat items", () => {
  const tool = (id: string, kind: string, status: "done" | "error" = "done"): CachedChatMessage => ({
    id, role: "tool", text: id, meta: { callId: id, kind, tool: kind, toolStatus: status },
  })

  test("quiet calls of one kind fold into one item; others stay; items are stable across renders", () => {
    const items = createChatItems()
    const u: CachedChatMessage = { id: "u", role: "user", text: "go" }
    const msgs = [u, tool("a", "file"), tool("b", "file"), tool("c", "file"), tool("d", "shell", "error"), tool("e", "file")]
    const first = items(msgs)
    expect(first.map((i) => (i.type === "tools" ? `tools:${i.kind}:${i.rows.length}` : i.message.id))).toEqual(["u", "tools:file:3", "d", "e"])
    const second = items([...msgs, { id: "x", role: "assistant", text: "ok" }])
    expect(second[0]).toBe(first[0]!)
    expect(second[1]).toBe(first[1]!)
  })
})
