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
  /**
   * The agent runs, but without the Cursor SDK sandbox (the desktop host on
   * Windows: cursor-sdk-bridge has no filesystem sandbox on win32). Shell
   * commands then have the user's own access to files and network; the
   * Studio shows a warning. Optional: hosts that predate it omit it.
   */
  agent_unsandboxed: z.boolean().optional(),
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

/**
 * Remote host (vibechat-server on the user's server, docs/adr/0002 addendum):
 * the desktop app checks the protocol in `GET /host/hello` before it opens the
 * window, and authenticates with the host token (32 random bytes; the server
 * keeps only its sha256). The token never reaches the WebView: the app's Go
 * side trades it (`Authorization: Bearer`) for a one-time ticket, the window
 * opens `HOST_SESSION_PATH?ticket=…` and gets an HttpOnly SameSite=Strict
 * session cookie. The in-process desktop host (Wails) has no auth and answers
 * the ticket route with 404.
 */
export const HOST_PROTOCOL = 1 as const
/** Oldest desktop app protocol this host still serves. */
export const HOST_MIN_CLIENT_PROTOCOL = 1 as const
/** Outside `HOST_SEAM_PREFIX`: trades `?ticket=` for the session cookie, then redirects to `/`. */
export const HOST_SESSION_PATH = "/auth/session" as const
export const HOST_SESSION_COOKIE = "vibechat_session" as const
export const HOST_TICKET_PARAM = "ticket" as const
/** One-time ticket lifetime (seconds). */
export const HOST_TICKET_TTL_SECONDS = 60 as const

export const HostHelloSchema = z.object({
  /** Seam version (`HOST_SEAM_VERSION`). */
  seam: z.string().min(1),
  /** Server build version (the app warns when it is older than the app). */
  serverVersion: z.string().min(1),
  /** Stable random id of this server install (the app pins it next to the host key). */
  instanceId: z.string().min(16),
  protocol: z.number().int().positive(),
  minClientProtocol: z.number().int().positive(),
  /** Port of the preview gateway (`http://<projectId>.preview.localhost:<port>/`); the tunnel forwards the same port. */
  previewPort: z.number().int().positive().optional(),
  capabilities: HostCapabilitiesSchema,
})
export type HostHello = z.infer<typeof HostHelloSchema>

export const HostTicketSchema = z.object({
  ticket: z.string().min(32),
  /** RFC 3339. */
  expiresAt: z.string().min(1),
})
export type HostTicket = z.infer<typeof HostTicketSchema>

/**
 * Routes of the remote host that the desktop app (Go) calls, not the Studio;
 * relative to `HOST_SEAM_PREFIX`. `GET /host/hello` needs no auth; `POST
 * /auth/ticket` needs the Bearer host token (a session cookie is not enough).
 */
export const HOST_REMOTE_ROUTES: readonly HostSeamRoute[] = [
  { method: "GET", path: "/host/hello" },
  { method: "POST", path: "/auth/ticket" },
]
