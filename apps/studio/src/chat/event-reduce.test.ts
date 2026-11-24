import { describe, expect, test } from "bun:test"
import { reduceEventSequence } from "./event-reduce"

describe("reduceEventSequence (S2.1 smoke)", () => {
  test("prompt → deltas → tools → idle without preview side effects", () => {
    const sid = "sess-1"
    const runId = "run-1"
    const state = reduceEventSequence([
      {
        type: "session.status",
        sessionId: sid,
        status: "running",
        runId,
      },
      {
        type: "message.delta",
        sessionId: sid,
        role: "assistant",
        text: "Hello",
        runId,
      },
      {
        type: "message.delta",
        sessionId: sid,
        role: "assistant",
        text: " world",
        runId,
      },
      {
        type: "tool.started",
        sessionId: sid,
        tool: "editFile",
        summary: "edit",
        runId,
      },
      {
        type: "tool.finished",
        sessionId: sid,
        tool: "editFile",
        summary: "done",
        runId,
      },
      {
        type: "files.changed",
        sessionId: sid,
        paths: [],
        runId,
      },
      {
        type: "usage",
        sessionId: sid,
        tokensIn: 10,
        tokensOut: 20,
        runId,
      },
      {
        type: "session.status",
        sessionId: sid,
        status: "idle",
        runId,
      },
    ])

    const assistant = state.messages.find((m) => m.role === "assistant")
    expect(assistant?.text).toBe("Hello world")
    expect(assistant?.streaming).toBe(false)
    expect(assistant?.runId).toBe(runId)
    expect(state.tools).toEqual([])
    expect(state.status).toBe("idle")
    expect(state.usage).toEqual({ tokensIn: 10, tokensOut: 20 })
  })

  test("Composer 2.5 Fast path stamps runId on deltas", () => {
    const state = reduceEventSequence([
      {
        type: "message.delta",
        sessionId: "s",
        role: "assistant",
        text: "fast",
        runId: "run-fast",
      },
      { type: "session.status", sessionId: "s", status: "idle", runId: "run-fast" },
    ])
    expect(state.messages[0]?.runId).toBe("run-fast")
    expect(state.status).toBe("idle")
  })

  test("tool card keeps command header and streams detail", () => {
    const state = reduceEventSequence([
      {
        type: "tool.started",
        sessionId: "s1",
        tool: "shell",
        summary: "$ bun test",
        detail: "cwd /ws\n",
        callId: "c1",
      },
      {
        type: "tool.delta",
        sessionId: "s1",
        tool: "shell",
        text: "pass\n",
        callId: "c1",
      },
      {
        type: "tool.finished",
        sessionId: "s1",
        tool: "shell",
        summary: "$ bun test",
        detail: "cwd /ws\npass\nexit 0",
        callId: "c1",
      },
    ])
    const tool = state.messages.find((m) => m.role === "tool")
    expect(tool?.text).toBe("$ bun test")
    expect(tool?.meta?.detail).toContain("exit 0")
    expect(tool?.meta?.toolStatus).toBe("done")
    expect(tool?.streaming).toBe(false)
  })
})
