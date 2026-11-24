import { describe, expect, test } from "bun:test"
import { AgentEventSchema, type AgentEvent } from "@buildy/agent-contract"
import probe from "./fixtures/sandbox-probe.json"
import longShell from "./fixtures/long-shell-aborted.json"
import {
  TOOL_OUTPUT_MAX,
  createToolState,
  groupToolCalls,
  reduceToolEvents,
  runningCount,
} from "./model"

const events = (f: { events: unknown[] }): AgentEvent[] => f.events.map((e) => AgentEventSchema.parse(e))

describe("tool-call model (ADR 0005)", () => {
  test("fixtures are valid Agent Contract v1 events", () => {
    expect(events(probe).length).toBeGreaterThan(10)
    expect(events(longShell).length).toBeGreaterThan(400)
  })

  test("a real sandbox run: six calls, started → finished by callId, errors from the result", () => {
    const s = reduceToolEvents(createToolState(), events(probe))
    expect(s.calls.map((c) => [c.tool, c.status])).toEqual([
      ["edit", "done"],
      ["read", "error"],
      ["shell", "error"],
      ["shell", "error"],
      ["shell", "error"], // bun crashed: exit 134
      ["shell", "error"],
    ])
    expect(s.calls[0]!.output).toContain("+hi")
    expect(s.calls[2]!.output).toContain("Permission denied")
    expect(runningCount(s)).toBe(0)
  })

  test("a long stream keeps only the tail and is cancelled when the run ends", () => {
    const s = reduceToolEvents(createToolState(), events(longShell))
    const shell = s.calls[0]!
    expect(shell.status).toBe("cancelled")
    expect(shell.truncated).toBe(true)
    expect(shell.output.length).toBeLessThanOrEqual(TOOL_OUTPUT_MAX)
    expect(shell.output.endsWith("line 0399 " + "x".repeat(60) + "\n")).toBe(true)
  })

  test("a delta without callId goes to the latest running call of the same tool", () => {
    const s = reduceToolEvents(createToolState(), [
      { type: "tool.started", sessionId: "s", tool: "shell", summary: "ls" },
      { type: "tool.delta", sessionId: "s", tool: "shell", text: "a\n" },
      { type: "tool.finished", sessionId: "s", tool: "shell", summary: "ls" },
    ])
    expect(s.calls).toHaveLength(1)
    expect(s.calls[0]).toMatchObject({ status: "done", output: "a\n" })
  })

  test("a finished event without a started one still shows the call", () => {
    const s = reduceToolEvents(createToolState(), [
      { type: "tool.finished", sessionId: "s", tool: "read", kind: "file", summary: "read a.ts", callId: "x" },
    ])
    expect(s.calls[0]).toMatchObject({ tool: "read", status: "done", summary: "read a.ts" })
  })

  test("consecutive finished calls of one kind group; running and failed calls stay single", () => {
    const s = reduceToolEvents(createToolState(), events(longShell))
    const groups = groupToolCalls(s.calls)
    expect(groups.map((g) => (g.type === "group" ? `group:${g.kind}:${g.calls.length}` : `single:${g.call.status}`)))
      .toEqual(["single:cancelled", "group:file:3"])
    const p = groupToolCalls(reduceToolEvents(createToolState(), events(probe)).calls)
    expect(p.every((g) => g.type === "single")).toBe(true)
  })
})
