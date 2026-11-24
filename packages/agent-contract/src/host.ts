/**
 * Desktop host seam (docs/adr/0002) — additive to Agent Contract v1.
 *
 * The Studio (apps/web) talks only to these routes, same-origin. The host is
 * the Go process in buildytech/vibechat-desktop: it owns the Cursor key (OS
 * keychain), project folders and git worktrees, the agent (cursor-sdk-bridge
 * with the SDK sandbox on) and the preview (dev-server child process behind a
 * loopback proxy on its own port with a one-time token).
 *
 * The UI branches only on `HostCapabilities` flags, never on a host name.
 */

import { z } from "zod"

export const HOST_SEAM_VERSION = "1" as const

/**
 * URL prefix of every seam route on the host origin. The desktop host answers
 * it in its asset-server middleware (`/runtime/v1/*`, the buildychat-desktop
 * pattern); everything else is the Studio bundle.
 */
export const HOST_SEAM_PREFIX = "/runtime/v1" as const

export const HostCapabilitiesSchema = z.object({
  /** Seam version the host implements (`HOST_SEAM_VERSION`). */
  seam: z.string().min(1),
  /** Host build version for the About/Settings line (display only). */
  version: z.string().min(1),
  /** Projects are folders on this machine opened by the user. */
  local_folder: z.boolean(),
  /** The host can put a session in its own git worktree. */
  worktrees: z.boolean(),
  /** The host runs a dev server and mints preview grant URLs. */
  preview_local: z.boolean(),
  /**
   * The agent runs inside the Cursor SDK sandbox (writes limited to the
   * project, no network). A host that cannot start the sandbox must report
   * false and refuse agent prompts (fail closed).
   */
  agent_sandbox: z.boolean(),
  /** New projects can be scaffolded from the template registry. */
  templates: z.boolean(),
})
export type HostCapabilities = z.infer<typeof HostCapabilitiesSchema>

export type HostSeamRoute = {
  method: "GET" | "POST" | "PUT" | "DELETE"
  /** Express-style path; `:id`/`:sid`/`:rid` are path params. */
  path: string
  /** Server-sent events stream (Agent Contract v1 `AgentEvent`). */
  sse?: boolean
}

/**
 * Every route the Studio calls, relative to `HOST_SEAM_PREFIX`. Mirrored to
 * `host-seam.json` (`bun run gen:host-seam`) for the Go host's contract test.
 * The Go host must serve all of them (a route it
 * cannot honour answers 404/501 with `{ error }`, never a blank page).
 */
export const HOST_SEAM_ROUTES: readonly HostSeamRoute[] = [
  { method: "GET", path: "/host/capabilities" },
  { method: "GET", path: "/me/cursor" },
  { method: "GET", path: "/me/credentials" },
  { method: "PUT", path: "/me/credentials/:runtime/:providerId" },
  { method: "DELETE", path: "/me/credentials/:runtime/:providerId" },
  { method: "GET", path: "/templates" },
  { method: "GET", path: "/projects" },
  { method: "POST", path: "/projects" },
  { method: "POST", path: "/projects/:id/clone" },
  { method: "POST", path: "/projects/:id/delete" },
  { method: "POST", path: "/projects/:id/ensure" },
  { method: "POST", path: "/projects/:id/stop" },
  { method: "GET", path: "/projects/:id/status" },
  { method: "POST", path: "/projects/:id/preview/grant" },
  { method: "GET", path: "/projects/:id/files" },
  { method: "GET", path: "/projects/:id/file" },
  { method: "PUT", path: "/projects/:id/file" },
  { method: "GET", path: "/projects/:id/brief" },
  { method: "PUT", path: "/projects/:id/brief" },
  { method: "POST", path: "/projects/:id/brief/from-image" },
  { method: "GET", path: "/projects/:id/agent/capabilities" },
  { method: "GET", path: "/projects/:id/agent/sessions" },
  { method: "POST", path: "/projects/:id/agent/sessions" },
  { method: "DELETE", path: "/projects/:id/agent/sessions/:sid" },
  { method: "POST", path: "/projects/:id/agent/sessions/:sid/messages" },
  { method: "GET", path: "/projects/:id/agent/sessions/:sid/messages" },
  { method: "GET", path: "/projects/:id/agent/sessions/:sid/events", sse: true },
  { method: "GET", path: "/projects/:id/agent/sessions/:sid/export" },
  { method: "POST", path: "/projects/:id/agent/sessions/:sid/abort" },
  { method: "POST", path: "/projects/:id/agent/import" },
  { method: "POST", path: "/projects/:id/agent/runs/:rid/feedback" },
]
