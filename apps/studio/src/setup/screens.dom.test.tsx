import { describe, expect, test } from "bun:test"
import { render } from "solid-js/web"
import { DESKTOP_PROVISION_STEPS, DesktopProvisionSchema, type DesktopProvision } from "@buildy/agent-contract"
import { SetupIncus } from "./SetupIncus"
import { SetupInstall } from "./SetupInstall"
import { SetupReady } from "./SetupReady"
import { SetupStart } from "./SetupStart"

const CYRILLIC = /[\u0400-\u04FF]/

function prov(states: Record<string, string>, over: Partial<DesktopProvision> = {}): DesktopProvision {
  return DesktopProvisionSchema.parse({
    state: "running",
    address: "203.0.113.7",
    steps: DESKTOP_PROVISION_STEPS.map((id) => ({ id, state: states[id] ?? "pending", ...(states[id] && states[id] !== "pending" ? { startedAt: 1_000, ...(states[id] === "running" ? {} : { endedAt: 7_000 }) } : {}) })),
    rollbackSeconds: 300,
    startedAt: 1_000,
    now: 61_000,
    log: [{ at: 1_000, text: "remote: setup of 203.0.113.7 started" }, { at: 2_000, text: "provision: incus: apt-update: done in 6s" }],
    ...over,
  })
}

function mount(el: () => import("solid-js").JSX.Element): HTMLElement {
  const host = document.createElement("div")
  document.body.append(host)
  render(el, host)
  return host
}

function common(host: HTMLElement) {
  expect(CYRILLIC.test(host.textContent ?? "")).toBe(false)
  expect(host.querySelectorAll("h1").length).toBe(1)
  expect(host.querySelector("[style]")).toBeNull()
  for (const b of host.querySelectorAll("button")) expect(b.getAttribute("type")).toBeTruthy()
}

describe("setup screens", () => {
  test("start: the form, the requirements and a decorative scene", () => {
    let started = 0
    const host = mount(() => (
      <SetupStart
        form={{ address: "203.0.113.7", password: "x", rootKey: "", setAddress: () => {}, setPassword: () => {}, setRootKey: () => {} }}
        busy={false} retry={false} minutes={5} onStart={() => started++}
      />
    ))
    common(host)
    expect(host.querySelector("section h1")?.id).toBe("bsw-start-title")
    expect(host.querySelectorAll("input").length).toBe(2)
    expect(host.querySelector('input[type="password"]')).not.toBeNull()
    expect(host.querySelector(".bsw-scene")?.getAttribute("aria-hidden")).toBe("true")
    ;(host.querySelector("form") as HTMLFormElement).dispatchEvent(new Event("submit", { cancelable: true }))
    expect(started).toBe(1)
  })

  test("install: ten steps in four phases, a native progress, the log", () => {
    const host = mount(() => <SetupInstall p={prov({ connect: "done", preflight: "done", incus: "done", container: "done", server: "running" })} now={61_000} onIncus={() => {}} onEdit={() => {}} />)
    common(host)
    expect(host.querySelectorAll(".bsw-step").length).toBe(10)
    expect(host.querySelectorAll(".bsw-phase").length).toBe(4)
    const progress = host.querySelector("progress")!
    expect(progress.getAttribute("value")).toBe("4")
    expect(progress.getAttribute("max")).toBe("10")
    expect(progress.getAttribute("aria-label")).toBeTruthy()
    expect(host.querySelector(".bsw-step-running .bsw-step-time")?.textContent).toBe("1:00")
    expect(host.querySelector('[role="log"]')?.textContent).toContain("apt-update: done")
  })

  test("incus: eight blocks and substeps from the app, the span timer", () => {
    const p = prov({ connect: "done", preflight: "done", incus: "done", container: "running" })
    p.steps[2]!.subs = [
      { id: "apt-update", state: "done", startedAt: 1_000, endedAt: 7_000 },
      { id: "install-packages", state: "done", startedAt: 7_000, endedAt: 38_000 },
      { id: "admin-init", state: "done", startedAt: 38_000, endedAt: 39_000 },
    ]
    p.steps[3]!.subs = [{ id: "storage-pool", state: "running", startedAt: 40_000 }]
    let all = 0
    const host = mount(() => <SetupIncus p={p} now={61_000} onAll={() => all++} />)
    common(host)
    expect(host.querySelectorAll(".bsw-layer").length).toBe(8)
    expect(host.querySelectorAll(".bsw-layer-done").length).toBe(3)
    expect(host.querySelectorAll(".bsw-layer-running").length).toBe(1)
    expect(host.querySelector(".bsw-big-timer")?.textContent).toBe("1:00")
    expect(host.querySelector(".bsw-sub-running .bsw-sub-time")?.textContent).toBe("0:21")
    expect(host.querySelector(".bsw-sub-running code")?.textContent).toContain("incus storage create")
    ;(host.querySelector("button") as HTMLButtonElement).click()
    expect(all).toBe(1)
  })

  test("ready: the checks and the status while the app connects", () => {
    const states = Object.fromEntries(DESKTOP_PROVISION_STEPS.map((id) => [id, "done"]))
    const host = mount(() => <SetupReady p={prov(states)} />)
    common(host)
    expect(host.querySelectorAll(".bsw-check").length).toBe(4)
    expect(host.querySelector('[role="status"]')).not.toBeNull()
    expect(host.querySelector(".bsw-burst")?.getAttribute("aria-hidden")).toBe("true")
  })
})
