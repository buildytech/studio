import { describe, expect, test } from "bun:test"
import { render } from "solid-js/web"
import { createSignal } from "solid-js"
import { AgentEventSchema, type AgentEvent } from "@buildy/agent-contract"
import probe from "./fixtures/sandbox-probe.json"
import longShell from "./fixtures/long-shell-aborted.json"
import { createToolState, reduceToolEvents, type ToolCall } from "./model"
import { ToolCallView, ToolGroupView, ToolLiveRegion } from "./renderers"
import { callToRow, createChatItems, rowToCall } from "./rows"

const events = (f: { events: unknown[] }): AgentEvent[] => f.events.map((e) => AgentEventSchema.parse(e))
const mount = (view: () => any): HTMLElement => {
  const host = document.createElement("div")
  document.body.append(host)
  render(view, host)
  return host
}
const probeCalls = (): readonly ToolCall[] => reduceToolEvents(createToolState(), events(probe)).calls
const call = (over: Partial<ToolCall>): ToolCall => ({ ...probeCalls()[0]!, ...over })

describe("ToolCallView DOM/ARIA (ADR 0005)", () => {
  test("every call of a real run is a labelled group with a text status", () => {
    const host = mount(() => <>{probeCalls().map((c) => <ToolCallView call={c} />)}</>)
    const groups = [...host.querySelectorAll('[role="group"]')]
    expect(groups.length).toBe(6)
    for (const g of groups) {
      expect(g.getAttribute("aria-label")).toMatch(/^\w+: /)
      expect(g.querySelector('[data-slot="tool-status"]')?.textContent).toMatch(/done|failed/)
    }
    expect(groups.map((g) => g.getAttribute("data-status"))).toEqual(["done", "error", "error", "error", "error", "error"])
  })

  test("a running call is aria-busy and its output stays open; a done call folds", () => {
    const [c, setC] = createSignal<ToolCall>(call({ status: "running", output: "line 1" }))
    const host = mount(() => <ToolCallView call={c()} />)
    const root = host.querySelector('[role="group"]')!
    expect(root.getAttribute("aria-busy")).toBe("true")
    expect(host.querySelector("details")?.hasAttribute("open")).toBe(true)
    setC({ ...c(), status: "done" })
    expect(root.getAttribute("aria-busy")).toBe("false")
    expect(root.querySelector('[data-slot="tool-status"]')?.textContent).toBe("done")
  })

  test("the edit renderer shows diff lines and +/− stats", () => {
    const edit = probeCalls()[0]!
    expect(edit.tool).toBe("edit")
    const host = mount(() => <ToolCallView call={edit} />)
    expect(host.textContent).toContain("+hi")
    expect(host.textContent).toMatch(/\+\d+ −\d+/)
  })

  test("a long aborted stream is clipped, marked truncated and stopped", () => {
    const shell = reduceToolEvents(createToolState(), events(longShell)).calls[0]!
    const host = mount(() => <ToolCallView call={shell} />)
    expect(host.querySelector('[role="group"]')?.getAttribute("data-status")).toBe("cancelled")
    expect(host.textContent).toContain("Showing the last")
  })

  test("quiet calls of one kind fold into one group row with a count", () => {
    const reads = [1, 2, 3].map((i) => call({ id: `r${i}`, tool: "read", kind: "file", status: "done", summary: `f${i}.ts` }))
    const rows = reads.map((c, i) => callToRow(c, `m${i}`))
    const items = createChatItems()(rows)
    expect(items.length).toBe(1)
    const item = items[0]!
    if (item.type !== "tools") throw new Error("expected a group")
    const host = mount(() => <ToolGroupView kind={item.kind} calls={item.rows.map(rowToCall)} />)
    const details = host.querySelector("details")!
    expect(details.hasAttribute("open")).toBe(false)
    expect(host.querySelector("summary")?.textContent).toContain("3 file calls")
    expect(details.querySelectorAll('[role="group"]').length).toBe(3)
  })

  test("the live region speaks status changes, not output deltas", () => {
    const [c, setC] = createSignal<ToolCall>(call({ tool: "shell", status: "running", output: "" }))
    const host = mount(() => <ToolLiveRegion call={c()} />)
    const live = host.querySelector('[aria-live="polite"]')!
    expect(live.textContent).toBe("shell running")
    setC({ ...c(), output: "more output" })
    expect(live.textContent).toBe("shell running")
    setC({ ...c(), status: "error" })
    expect(live.textContent).toBe("shell failed")
  })
})
