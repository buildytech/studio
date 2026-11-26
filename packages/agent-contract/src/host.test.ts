import { describe, expect, test } from "bun:test"
import {
  HOST_MIN_CLIENT_PROTOCOL,
  HOST_PROTOCOL,
  HOST_REMOTE_ROUTES,
  HOST_SEAM_ROUTES,
  HOST_SESSION_PATH,
  HostCapabilitiesSchema,
  HostHelloSchema,
  HostTicketSchema,
} from "./host"

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

  test("remote routes are the app's own: hello and the ticket, apart from the Studio's", () => {
    const seam = new Set(HOST_SEAM_ROUTES.map((r) => `${r.method} ${r.path}`))
    expect(HOST_REMOTE_ROUTES.map((r) => `${r.method} ${r.path}`)).toEqual(["GET /host/hello", "POST /auth/ticket"])
    for (const r of HOST_REMOTE_ROUTES) expect(seam.has(`${r.method} ${r.path}`)).toBe(false)
    expect(HOST_SESSION_PATH.startsWith("/runtime")).toBe(false)
    expect(HOST_MIN_CLIENT_PROTOCOL).toBeLessThanOrEqual(HOST_PROTOCOL)
  })

  test("hello and ticket parse", () => {
    const hello = HostHelloSchema.parse({
      seam: "1",
      serverVersion: "0.2.0",
      instanceId: "0123456789abcdef0123",
      protocol: 1,
      minClientProtocol: 1,
      previewPort: 18121,
      capabilities: {
        seam: "1",
        version: "0.2.0",
        local_folder: true,
        worktrees: true,
        preview_local: true,
        agent_sandbox: true,
        templates: true,
      },
    })
    expect(hello.capabilities.agent_sandbox).toBe(true)
    expect(() => HostTicketSchema.parse({ ticket: "short", expiresAt: "x" })).toThrow()
  })
})
