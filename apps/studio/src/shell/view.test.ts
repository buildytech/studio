import { describe, expect, test } from "bun:test"
import type { DesktopConnection } from "@buildy/agent-contract"
import { firstTab, shellView } from "./view"

const base: DesktopConnection = { mode: "local", appVersion: "0.2.0", appProtocol: 1, sshPublicKey: "ssh-ed25519 AAAA" }

describe("shellView", () => {
  test("states", () => {
    expect(shellView(null)).toBe("loading")
    expect(shellView(base)).toBe("choose")
    expect(shellView({ ...base, connecting: true })).toBe("connecting")
    expect(shellView({ ...base, mode: "remote" })).toBe("connected")
    expect(shellView({ ...base, problem: { code: "protocol_app_old", message: "" } })).toBe("update")
    expect(shellView({ ...base, problem: { code: "unreachable", message: "" } })).toBe("choose")
  })
  test("first tab", () => {
    expect(firstTab(base)).toBe("setup")
    expect(firstTab({ ...base, target: { address: "a", user: "u", hostKeyFingerprint: "", tokenSaved: true } })).toBe("connect")
  })
})
