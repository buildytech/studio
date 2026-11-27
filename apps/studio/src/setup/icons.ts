import type { DesktopProvisionStepId, DesktopProvisionStepState, DesktopProvisionSubstepId } from "@buildy/agent-contract"
import type { SetupIconName } from "../app-icons/setup-icons"

/** The glyph of each step while it waits (a state glyph replaces it once it runs). */
export const STEP_ICONS: Record<DesktopProvisionStepId, SetupIconName> = {
  connect: "key-round",
  preflight: "list-checks",
  incus: "package",
  container: "box",
  server: "rocket",
  egress: "shield",
  token: "key-round",
  tunnel: "cable",
  verify: "stethoscope",
  lockdown: "lock",
}

export const SUB_ICONS: Record<DesktopProvisionSubstepId, SetupIconName> = {
  "apt-update": "refresh-cw",
  "install-packages": "package",
  "admin-init": "power",
  "storage-pool": "hard-drive",
  bridge: "network",
  profile: "sliders-horizontal",
  "launch-image": "container",
  "wait-dns": "globe",
}

export function stateIcon(state: DesktopProvisionStepState, idle: SetupIconName): SetupIconName {
  switch (state) {
    case "running":
      return "loader-circle"
    case "done":
    case "skipped":
      return "check"
    case "failed":
      return "circle-x"
    default:
      return idle
  }
}
