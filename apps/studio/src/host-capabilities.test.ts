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
  test("explains a missing host instead of a blank pane", () => {
    expect(hostNotices(null)[0]).toContain("not reachable")
  })
})
