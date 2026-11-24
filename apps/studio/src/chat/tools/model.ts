import type { AgentEvent } from "@buildy/agent-contract"

/**
 * Tool-call model (ADR 0005): one pure reducer folds Agent Contract v1
 * tool events into ordered calls. The view, grouping and renderers read this
 * state; nothing else folds tool events.
 */

/** Tail of a call's output kept in memory and on screen (characters). */
export const TOOL_OUTPUT_MAX = 16_000

export type ToolStatus = "running" | "done" | "error" | "cancelled"

export type ToolCall = {
  /** callId from the host, or a local id when the host sent none. */
  id: string
  tool: string
  /** Coarse kind from the host: shell | search | agent | file | mcp | tool. */
  kind: string
  status: ToolStatus
  summary: string
  /** Streamed deltas, then the final detail (diff, exit text, error). */
  output: string
  /** True when the head of the output was dropped to stay under TOOL_OUTPUT_MAX. */
  truncated: boolean
  runId?: string
}

export type ToolState = { readonly calls: readonly ToolCall[]; readonly seq: number }

export const createToolState = (): ToolState => ({ calls: [], seq: 0 })

export const runningCount = (s: ToolState): number =>
  s.calls.reduce((n, c) => n + (c.status === "running" ? 1 : 0), 0)

/**
 * The host reports a failed call in the result text, not a flag:
 * "error: …" from the SDK, or a shell exit line with a non-zero code.
 */
export function finishedStatus(detail: string | undefined): "done" | "error" {
  if (!detail) return "done"
  if (/^error\b/i.test(detail.trimStart())) return "error"
  if (/(^|\n)exit [1-9]\d*\s*$/.test(detail)) return "error"
  return "done"
}

function clipTail(text: string): { text: string; truncated: boolean } {
  if (text.length <= TOOL_OUTPUT_MAX) return { text, truncated: false }
  const cut = text.slice(text.length - TOOL_OUTPUT_MAX)
  const nl = cut.indexOf("\n")
  // Start on a whole line when one begins near the cut.
  return { text: nl >= 0 && nl < 200 ? cut.slice(nl + 1) : cut, truncated: true }
}

type ToolEvent = Extract<AgentEvent, { type: "tool.started" | "tool.delta" | "tool.finished" }>

function findRunning(calls: readonly ToolCall[], e: ToolEvent): number {
  for (let i = calls.length - 1; i >= 0; i -= 1) {
    const c = calls[i]!
    if (e.callId ? c.id === e.callId : c.status === "running" && c.tool === e.tool) {
      return i
    }
  }
  return -1
}

function replace(s: ToolState, i: number, call: ToolCall): ToolState {
  const calls = s.calls.slice()
  calls[i] = call
  return { ...s, calls }
}

export function reduceToolEvent(s: ToolState, e: AgentEvent): ToolState {
  switch (e.type) {
    case "tool.started": {
      const i = e.callId ? findRunning(s.calls, e) : -1
      if (i >= 0) {
        const c = s.calls[i]!
        return replace(s, i, { ...c, summary: e.summary || c.summary, kind: e.kind ?? c.kind })
      }
      const seq = s.seq + 1
      const call: ToolCall = {
        id: e.callId ?? `local-${seq}`,
        tool: e.tool,
        kind: e.kind ?? "tool",
        status: "running",
        summary: e.summary ?? e.tool,
        output: e.detail ?? "",
        truncated: false,
        ...(e.runId ? { runId: e.runId } : {}),
      }
      return { calls: [...s.calls, call], seq }
    }
    case "tool.delta": {
      const i = findRunning(s.calls, e)
      if (i < 0 || !e.text) return s
      const c = s.calls[i]!
      if (c.status !== "running") return s
      const { text, truncated } = clipTail(c.output + e.text)
      return replace(s, i, { ...c, output: text, truncated: c.truncated || truncated })
    }
    case "tool.finished": {
      const i = findRunning(s.calls, e)
      const status = finishedStatus(e.detail)
      if (i < 0) {
        const started = reduceToolEvent(s, { ...e, type: "tool.started", detail: undefined })
        return reduceToolEvent(started, e)
      }
      const c = s.calls[i]!
      const final = e.detail ? clipTail(e.detail) : { text: c.output, truncated: c.truncated }
      return replace(s, i, {
        ...c,
        status,
        summary: e.summary || c.summary,
        kind: e.kind ?? c.kind,
        output: final.text,
        truncated: final.truncated,
      })
    }
    case "session.status":
      if (e.status === "idle" || e.status === "error") return cancelRunning(s)
      return s
    default:
      return s
  }
}

export const reduceToolEvents = (s: ToolState, events: readonly AgentEvent[]): ToolState =>
  events.reduce(reduceToolEvent, s)

/** The run ended (idle, error, Stop): whatever is still running will not finish. */
export function cancelRunning(s: ToolState): ToolState {
  if (!runningCount(s)) return s
  return {
    ...s,
    calls: s.calls.map((c) => (c.status === "running" ? { ...c, status: "cancelled" } : c)),
  }
}

export type ToolGroup =
  | { type: "single"; call: ToolCall }
  | { type: "group"; kind: string; calls: ToolCall[] }

/** Calls that need no attention (finished fine) collapse into one row per kind. */
export const GROUP_MIN = 2

export function groupToolCalls(calls: readonly ToolCall[]): ToolGroup[] {
  const out: ToolGroup[] = []
  let run: ToolCall[] = []
  const flush = () => {
    if (run.length >= GROUP_MIN) out.push({ type: "group", kind: run[0]!.kind, calls: run })
    else for (const call of run) out.push({ type: "single", call })
    run = []
  }
  for (const call of calls) {
    const quiet = call.status === "done"
    if (quiet && run.length && run[0]!.kind === call.kind) {
      run.push(call)
      continue
    }
    flush()
    if (quiet) run.push(call)
    else out.push({ type: "single", call })
  }
  flush()
  return out
}
