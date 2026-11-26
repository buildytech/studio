import { describe, expect, test } from "bun:test"
import {
  HOST_MIN_CLIENT_PROTOCOL,
  HOST_PROTOCOL,
  DESKTOP_PROVISION_STEPS,
  DesktopProvisionInputSchema,
  DesktopProvisionSchema,
  HOST_DESKTOP_ROUTES,
  HOST_REMOTE_ROUTES,
  HOST_SEAM_ROUTES,
  HOST_SESSION_PATH,
  HostCapabilitiesSchema,
  HostHelloSchema,
  HostTicketSchema,
  DesktopConnectionSchema,
  DesktopConnectInputSchema,
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

  test("desktop routes are the app's own and collide with nothing", () => {
    const others = new Set([...HOST_SEAM_ROUTES, ...HOST_REMOTE_ROUTES].map((r) => `${r.method} ${r.path}`))
    for (const r of HOST_DESKTOP_ROUTES) {
      expect(r.path.startsWith("/desktop/")).toBe(true)
      expect(others.has(`${r.method} ${r.path}`)).toBe(false)
    }
  })

  test("desktop connection parses both modes", () => {
    const local = DesktopConnectionSchema.parse({ mode: "local", appVersion: "0.1.6", appProtocol: 1, sshPublicKey: "ssh-ed25519 AAAA vibechat" })
    expect(local.target).toBeUndefined()
    const remote = DesktopConnectionSchema.parse({
      mode: "remote",
      appVersion: "0.1.6",
      appProtocol: 1,
      sshPublicKey: "ssh-ed25519 AAAA vibechat",
      target: { address: "srv.example", user: "vibechat-tunnel", hostKeyFingerprint: "SHA256:x", tokenSaved: true },
      server: { version: "0.1.5", protocol: 1, minClientProtocol: 1, instanceId: "0123456789abcdef" },
      serverOutdated: true,
    })
    expect(remote.serverOutdated).toBe(true)
    expect(() => DesktopConnectInputSchema.parse({ address: "", user: "u" })).toThrow()
  })

  test("setup wizard: ten steps in order, progress and input parse", () => {
    expect([...DESKTOP_PROVISION_STEPS]).toEqual(["connect", "preflight", "incus", "container", "server", "egress", "token", "tunnel", "verify", "lockdown"])
    const p = DesktopProvisionSchema.parse({
      state: "failed",
      steps: DESKTOP_PROVISION_STEPS.map((id, i) => ({ id, state: i < 2 ? "done" : i === 2 ? "failed" : "pending" })),
      address: "203.0.113.5",
      rollbackSeconds: 300,
      problem: { code: "unsupported", message: "Debian 13 is required" },
    })
    expect(p.steps).toHaveLength(10)
    expect(() => DesktopProvisionSchema.parse({ ...p, steps: [{ id: "reboot", state: "done" }] })).toThrow()
    expect(DesktopProvisionInputSchema.parse({ address: "203.0.113.5", password: "pw" }).rootPublicKey).toBeUndefined()
    expect(() => DesktopProvisionInputSchema.parse({ address: "203.0.113.5", password: "" })).toThrow()
  })
})
