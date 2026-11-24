import { describe, expect, test } from "bun:test"
import { HOST_SEAM_ROUTES, HostCapabilitiesSchema } from "./host"

describe("desktop host seam (docs/adr/0002)", () => {
  test("capabilities parse and stay additive", () => {
    const caps = HostCapabilitiesSchema.parse({
      seam: "1",
      version: "0.1.0",
      local_folder: true,
      worktrees: true,
      preview_local: true,
      agent_sandbox: true,
      templates: true,
      future_flag: true,
    })
    expect(caps.agent_sandbox).toBe(true)
  })

  test("routes are unique and carry no cloud-only paths", () => {
    const keys = HOST_SEAM_ROUTES.map((r) => `${r.method} ${r.path}`)
    expect(new Set(keys).size).toBe(keys.length)
    for (const r of HOST_SEAM_ROUTES) {
      expect(r.path.startsWith("/auth")).toBe(false)
      expect(r.path.startsWith("/operations")).toBe(false)
      expect(r.path.includes("/support")).toBe(false)
    }
    expect(HOST_SEAM_ROUTES.filter((r) => r.sse).map((r) => r.path)).toEqual([
      "/projects/:id/agent/sessions/:sid/events",
    ])
  })
})
