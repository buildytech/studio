/**
 * Preview iframe policy: one initial mount for an already-ready runner, or an
 * explicit Start. The visible iframe gets grant src once (imperative); never
 * rewrite or remount it from status polling.
 */

export type PreviewRunnerStatus =
  | "idle"
  | "starting"
  | "created"
  | "running"
  | "exited"
  | "stopped"
  | "not_found"
  | "error"
  | string

/** Status pill while a frame is already showing — ignore brief !ready blips. */
export function stableStatusWhileFramed(
  reported: PreviewRunnerStatus,
  ready: boolean | undefined,
  hasFrame: boolean,
): PreviewRunnerStatus {
  if (!hasFrame) {
    if (reported === "running" && ready === false) return "starting"
    return reported
  }
  if (reported === "running") return "running"
  return reported
}

export function shouldAutoMountPreview(opts: {
  status: PreviewRunnerStatus
  ready: boolean | undefined
  previewOpen: boolean
  hasFrame: boolean
  booting: boolean
  attempted: boolean
}): boolean {
  return (
    opts.status === "running"
    && opts.ready === true
    && opts.previewOpen
    && !opts.hasFrame
    && !opts.booting
    && !opts.attempted
  )
}
