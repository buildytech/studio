import type { HostCapabilities } from "@buildy/agent-contract"
import { t } from "./i18n"

/**
 * Studio notices derived from host capabilities (docs/adr/0002). Pure so it is
 * testable without a DOM; the UI renders whatever this returns.
 */
export function hostNotices(caps: HostCapabilities | null | undefined): string[] {
  if (!caps) {
    return ["Desktop host is not reachable — open this Studio from the vibechat app."]
  }
  const notes: string[] = []
  if (!caps.agent_sandbox) {
    notes.push(
      "Agent sandbox is unavailable on this machine, so the agent is turned off. Files and preview still work.",
    )
  }
  if (caps.agent_sandbox && caps.agent_unsandboxed) {
    notes.push(t("host.agentUnsandboxed"))
  }
  if (!caps.preview_local) {
    notes.push("Live preview is not available from this host.")
  }
  return notes
}
