import { describe, expect, test } from "bun:test"
import { hostNotices } from "./host-capabilities"

const full = {
  seam: "1",
  version: "0.1.0",
  local_folder: true,
  worktrees: true,
  preview_local: true,
  agent_sandbox: true,
  templates: true,
}

describe("hostNotices", () => {
  test("no notices when the host has everything", () => {
    expect(hostNotices(full)).toEqual([])
  })
  test("fails closed visibly when the sandbox is missing", () => {
    expect(hostNotices({ ...full, agent_sandbox: false })[0]).toContain("agent is turned off")
  })
  test("warns when the agent runs without the sandbox (Windows desktop host)", () => {
    const notes = hostNotices({ ...full, agent_unsandboxed: true })
    expect(notes).toHaveLength(1)
    expect(notes[0]).toContain("without a sandbox")
    expect(notes[0]).toContain("без песочницы")
    expect(hostNotices({ ...full, agent_unsandboxed: false })).toEqual([])
  })
  test("explains a missing host instead of a blank pane", () => {
    expect(hostNotices(null)[0]).toContain("not reachable")
  })
})
