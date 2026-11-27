import { describe, expect, test } from "bun:test"
import { DESKTOP_PROVISION_STEPS, DESKTOP_PROVISION_SUBSTEPS, DesktopProvisionSchema, type DesktopProvision } from "@buildy/agent-contract"
import { PHASES, allFinished, appNow, clock, doneCount, elapsed, incusSpan, incusSubs, phaseState, setupView } from "./model"

function prov(states: Partial<Record<string, string>>, over: Partial<DesktopProvision> = {}): DesktopProvision {
  return DesktopProvisionSchema.parse({
    state: "running",
    steps: DESKTOP_PROVISION_STEPS.map((id) => ({ id, state: states[id] ?? "pending" })),
    rollbackSeconds: 300,
    now: 10_000,
    log: [],
    ...over,
  })
}
const o = { editing: false, showAll: false }

describe("setup view", () => {
  test("idle and editing show the form", () => {
    expect(setupView(null, o)).toBe("start")
    expect(setupView(prov({}, { state: "idle" }), o)).toBe("start")
    expect(setupView(prov({ connect: "running" }), { ...o, editing: true })).toBe("start")
  })
  test("incus and container show the Incus screen unless all steps were asked for", () => {
    expect(setupView(prov({ connect: "done", preflight: "done", incus: "running" }), o)).toBe("incus")
    expect(setupView(prov({ connect: "done", preflight: "done", incus: "done", container: "running" }), o)).toBe("incus")
    expect(setupView(prov({ connect: "done", preflight: "done", incus: "running" }), { ...o, showAll: true })).toBe("install")
    expect(setupView(prov({ connect: "running" }), o)).toBe("install")
  })
  test("every step finished is ready, while connecting and once done; a failure shows the steps", () => {
    const all = Object.fromEntries(DESKTOP_PROVISION_STEPS.map((id) => [id, id === "incus" ? "skipped" : "done"]))
    expect(setupView(prov(all), o)).toBe("ready")
    expect(setupView(prov(all, { state: "done" }), o)).toBe("ready")
    expect(allFinished(prov(all))).toBe(true)
    expect(setupView(prov({ connect: "done", preflight: "failed" }, { state: "failed" }), o)).toBe("install")
  })
})

describe("phases and substeps", () => {
  test("the four phases hold the ten steps in order", () => {
    expect(PHASES.flatMap((p) => p.steps)).toEqual([...DESKTOP_PROVISION_STEPS])
  })
  test("phase state", () => {
    const p = prov({ connect: "done", preflight: "done", incus: "running" })
    expect(PHASES.map((ph) => phaseState(p, ph))).toEqual(["done", "running", "pending", "pending"])
    expect(phaseState(prov({ connect: "failed" }), PHASES[0])).toBe("failed")
    expect(doneCount(p)).toBe(2)
  })
  test("the Incus screen lists the eight substeps, pending when the app sent none", () => {
    const subs = incusSubs(prov({}))
    expect(subs.map((s) => s.id)).toEqual([...DESKTOP_PROVISION_SUBSTEPS.incus, ...DESKTOP_PROVISION_SUBSTEPS.container])
    expect(subs.every((s) => s.state === "pending")).toBe(true)
    const p = prov({ incus: "running" })
    p.steps[2]!.subs = [{ id: "apt-update", state: "done", startedAt: 1000, endedAt: 7000 }, { id: "install-packages", state: "running", startedAt: 7000 }]
    expect(incusSubs(p).slice(0, 3).map((s) => s.state)).toEqual(["done", "running", "pending"])
  })
  test("the Incus span runs from incus start to container end", () => {
    const p = prov({ incus: "done", container: "done" })
    p.steps[2]!.startedAt = 1000
    p.steps[3]!.endedAt = 61_000
    expect(incusSpan(p)).toEqual({ startedAt: 1000, endedAt: 61_000 })
    p.steps[3]!.state = "running"
    expect(incusSpan(p).endedAt).toBeUndefined()
  })
})

describe("timers", () => {
  test("the app's clock and elapsed time", () => {
    const p = prov({}, { now: 50_000 })
    expect(appNow(p, 1000, 3500)).toBe(52_500)
    expect(elapsed(undefined, undefined, 5)).toBeUndefined()
    expect(elapsed(10_000, undefined, 75_000)).toBe(65_000)
    expect(elapsed(10_000, 20_000, 75_000)).toBe(10_000)
  })
  test("clock", () => {
    expect(clock(undefined)).toBe("\u2014")
    expect(clock(0)).toBe("0:00")
    expect(clock(65_400)).toBe("1:05")
    expect(clock(3_725_000)).toBe("1:02:05")
  })
})
