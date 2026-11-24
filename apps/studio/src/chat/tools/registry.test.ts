import { describe, expect, test } from "bun:test"
import { AgentEventSchema } from "@buildy/agent-contract"
import probe from "./fixtures/sandbox-probe.json"
import { createToolState, reduceToolEvents, type ToolCall } from "./model"
import { ToolRendererRegistry, diffStats, parseUnifiedDiff, toolMatchers } from "./registry"

const calls = reduceToolEvents(createToolState(), probe.events.map((e) => AgentEventSchema.parse(e))).calls

const registry = () =>
  new ToolRendererRegistry<string>({ id: "fallback", matches: () => true, view: "fallback" })
    .register({ id: "shell", matches: toolMatchers.shell, view: "shell" })
    .register({ id: "read", matches: toolMatchers.read, view: "read" })
    .register({ id: "search", matches: toolMatchers.search, view: "search" })
    .register({ id: "edit", matches: toolMatchers.edit, view: "edit" })

const call = (tool: string, kind = "tool", output = ""): ToolCall => ({
  id: tool, tool, kind, status: "done", summary: tool, output, truncated: false,
})

describe("tool renderer registry", () => {
  test("the real run resolves to edit, read and shell renderers", () => {
    expect(calls.map((c) => registry().resolve(c).id)).toEqual(["edit", "read", "shell", "shell", "shell", "shell"])
  })

  test("unknown tools fall back; search and mcp kinds route by kind", () => {
    const r = registry()
    expect(r.resolve(call("mcp__figma__get", "mcp")).id).toBe("fallback")
    expect(r.resolve(call("codebase", "search")).id).toBe("search")
  })

  test("a later registration overrides a built-in one", () => {
    const r = registry().register({ id: "my-shell", matches: toolMatchers.shell, view: "mine" })
    expect(r.resolve(call("shell", "shell")).view).toBe("mine")
  })

  test("a diff from the host parses into classed lines with stats", () => {
    const lines = parseUnifiedDiff(calls[0]!.output)
    expect(lines.map((l) => l.type)).toEqual(["meta", "meta", "hunk", "add"])
    expect(diffStats(lines)).toEqual({ added: 1, removed: 0 })
  })
})
