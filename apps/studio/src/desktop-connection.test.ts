import { describe, expect, test } from "bun:test"
import type { DesktopConnection } from "@buildy/agent-contract"
import { ApiError } from "./chat/banner"
import { authorizedKeysLine, loadDesktopConnection, needsUpdate, tunnelSetupCommand } from "./desktop-connection"

const base: DesktopConnection = { mode: "local", appVersion: "0.1.6", appProtocol: 1, sshPublicKey: "ssh-ed25519 AAAAC3 vibechat" }

describe("desktop connection", () => {
  test("only protocol problems open the update screen", () => {
    expect(needsUpdate(null)).toBe(false)
    expect(needsUpdate(base)).toBe(false)
    expect(needsUpdate({ ...base, problem: { code: "unreachable", message: "x" } })).toBe(false)
    expect(needsUpdate({ ...base, problem: { code: "protocol_app_old", message: "x" } })).toBe(true)
    expect(needsUpdate({ ...base, problem: { code: "protocol_server_old", message: "x" } })).toBe(true)
  })

  test("the tunnel key may only forward the two loopback ports", () => {
    const line = authorizedKeysLine(" ssh-ed25519 AAAAC3 vibechat\n")
    expect(line).toBe('restrict,port-forwarding,permitopen="127.0.0.1:18120",permitopen="127.0.0.1:18121" ssh-ed25519 AAAAC3 vibechat')
    const cmd = tunnelSetupCommand("ssh-ed25519 AAAAC3 vibechat")
    expect(cmd).toContain("adduser --disabled-password")
    expect(cmd).toContain("/home/vibechat-tunnel/.ssh/authorized_keys")
    expect(cmd).toContain("chmod 600")
    expect(cmd).toContain("--shell /usr/sbin/nologin")
    // Idempotent: the key line is appended only when missing.
    expect(cmd).toContain("grep -qxF 'restrict,port-forwarding,")
  })

  test("a host without the desktop routes is not the desktop app", async () => {
    expect(await loadDesktopConnection(async () => { throw new ApiError(404, "Not found") })).toBeNull()
    expect(await loadDesktopConnection(async () => base)).toEqual(base)
    await expect(loadDesktopConnection(async () => { throw new ApiError(500, "boom") })).rejects.toThrow("boom")
  })
})
