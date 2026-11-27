import {
  DESKTOP_PROVISION_SUBSTEPS,
  type DesktopProvision,
  type DesktopProvisionStepId,
  type DesktopProvisionStepState,
  type DesktopProvisionSubstepId,
} from "@buildy/agent-contract"

/**
 * The setup wizard's screens (pure, tested in model.test.ts): which one shows for a progress answer, the four
 * phases of the ten steps, the substeps of Incus and the container, and the timers on the app's clock.
 */
export type SetupView = "start" | "install" | "incus" | "ready"
export type Step = DesktopProvision["steps"][number]
export type Sub = NonNullable<Step["subs"]>[number]

export const PHASES = [
  { id: "connect", steps: ["connect", "preflight"] },
  { id: "isolate", steps: ["incus", "container"] },
  { id: "server", steps: ["server", "egress", "token"] },
  { id: "secure", steps: ["tunnel", "verify", "lockdown"] },
] as const satisfies readonly { id: string; steps: readonly DesktopProvisionStepId[] }[]
export type PhaseId = (typeof PHASES)[number]["id"]

/** The steps the Incus screen covers: the Incus install and the container build. */
export const INCUS_STEPS = ["incus", "container"] as const satisfies readonly DesktopProvisionStepId[]

/** The command each substep runs on the host (technical, never translated). */
export const SUB_COMMANDS: Record<DesktopProvisionSubstepId, string> = {
  "apt-update": "apt-get update",
  "install-packages": "apt-get install incus btrfs-progs",
  "admin-init": "incus admin init --minimal",
  "storage-pool": "incus storage create vibechat btrfs",
  bridge: "incus network create vibechatbr0",
  profile: "incus profile set vibechat",
  "launch-image": "incus launch images:debian/13",
  "wait-dns": "getent hosts deb.debian.org",
}

export const finished = (s: DesktopProvisionStepState): boolean => s === "done" || s === "skipped"

export function allFinished(p: DesktopProvision): boolean {
  return p.steps.length > 0 && p.steps.every((s) => finished(s.state))
}

/** The running step, else the failed one. */
export function currentStep(p: DesktopProvision): Step | undefined {
  return p.steps.find((s) => s.state === "running") ?? p.steps.find((s) => s.state === "failed")
}

export function setupView(p: DesktopProvision | null | undefined, o: { editing: boolean; showAll: boolean }): SetupView {
  if (!p || p.state === "idle" || o.editing) return "start"
  if (p.state !== "failed" && allFinished(p)) return "ready"
  if (p.state === "failed") return "install"
  const cur = currentStep(p)
  if (!o.showAll && cur && (INCUS_STEPS as readonly string[]).includes(cur.id)) return "incus"
  return "install"
}

export function stepOf(p: DesktopProvision, id: DesktopProvisionStepId): Step | undefined {
  return p.steps.find((s) => s.id === id)
}

export function phaseState(p: DesktopProvision, phase: (typeof PHASES)[number]): DesktopProvisionStepState {
  const states = phase.steps.map((id) => stepOf(p, id)?.state ?? "pending")
  if (states.includes("failed")) return "failed"
  if (states.every(finished)) return "done"
  if (states.some((s) => s === "running" || finished(s))) return "running"
  return "pending"
}

export function doneCount(p: DesktopProvision): number {
  return p.steps.filter((s) => finished(s.state)).length
}

/** The substeps of the Incus screen in order, with the step each belongs to (pending when the app has none yet). */
export function incusSubs(p: DesktopProvision): (Sub & { step: (typeof INCUS_STEPS)[number] })[] {
  return INCUS_STEPS.flatMap((step) => {
    const subs = stepOf(p, step)?.subs ?? []
    return DESKTOP_PROVISION_SUBSTEPS[step].map((id) => ({ step, ...(subs.find((s) => s.id === id) ?? { id, state: "pending" as const }) }))
  })
}

/** The Incus screen's time: from the start of the incus step to the end of the container step (or now). */
export function incusSpan(p: DesktopProvision): { startedAt?: number; endedAt?: number } {
  const a = stepOf(p, "incus")
  const b = stepOf(p, "container")
  const end = b && finished(b.state) ? b.endedAt : undefined
  return { startedAt: a?.startedAt, endedAt: end }
}

/** The app's clock now: its answer's `now` plus the page time since the answer came. */
export function appNow(p: DesktopProvision, fetchedAt: number, pageNow: number): number {
  return p.now + Math.max(0, pageNow - fetchedAt)
}

export function elapsed(startedAt: number | undefined, endedAt: number | undefined, now: number): number | undefined {
  if (!startedAt) return undefined
  return Math.max(0, (endedAt || now) - startedAt)
}

/** m:ss, or h:mm:ss from an hour on. */
export function clock(ms: number | undefined): string {
  if (ms === undefined) return "\u2014"
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`
}

/** HH:MM:SS of a log line in the page's time zone. */
export function timeOfDay(at: number): string {
  const d = new Date(at)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":")
}
