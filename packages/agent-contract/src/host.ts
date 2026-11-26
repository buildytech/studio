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

/**
 * The desktop app's own routes (vibechat-desktop): the window's connection to a VibeChat server over SSH. Relative
 * to `HOST_SEAM_PREFIX`. The desktop app answers them in both modes, so the Studio reaches them same-origin: its
 * in-process host while the window shows the local Studio, its proxy in front of the SSH tunnel while the window
 * shows the server's Studio. A server never answers them (404: the Studio hides the server settings).
 *
 * `PUT` connects (the host token goes to the OS keychain, never to disk; the first connect pins the server's SSH host
 * key, later connects require the same key), then the app moves the window to the server's Studio. `DELETE` goes back
 * to the local Studio; `?forget=1` also drops the pinned host key and the token.
 */
export const HOST_DESKTOP_ROUTES: readonly HostSeamRoute[] = [
  { method: "GET", path: "/desktop/connection" },
  { method: "PUT", path: "/desktop/connection" },
  { method: "DELETE", path: "/desktop/connection" },
  { method: "GET", path: "/desktop/provision" },
  { method: "POST", path: "/desktop/provision" },
]

/** Why the app is not (or cannot stay) connected; `protocol_*` opens the update screen. */
export const DesktopProblemCodeSchema = z.enum([
  "protocol_app_old",
  "protocol_server_old",
  "host_key_changed",
  "unreachable",
  "auth",
  "port_busy",
  "bad_input",
])
export type DesktopProblemCode = z.infer<typeof DesktopProblemCodeSchema>

export const DesktopConnectionSchema = z.object({
  /** local: the window shows the app's own Studio; remote: the server's, through the tunnel. */
  mode: z.enum(["local", "remote"]),
  appVersion: z.string().min(1),
  /** `HOST_PROTOCOL` of the app's pinned contract. */
  appProtocol: z.number().int().positive(),
  /** The app's SSH public key (one OpenSSH line) for the server's authorized_keys; the private key stays in the OS keychain. */
  sshPublicKey: z.string(),
  /** The saved server, if any. */
  target: z
    .object({
      address: z.string().min(1),
      user: z.string().min(1),
      /** SHA256 fingerprint of the pinned SSH host key (`SHA256:…`); empty until the first connect. */
      hostKeyFingerprint: z.string(),
      /** A host token is in the keychain. */
      tokenSaved: z.boolean(),
    })
    .optional(),
  /** The server's hello, once connected (or when the protocol check failed). */
  server: z
    .object({
      version: z.string().min(1),
      protocol: z.number().int().positive(),
      minClientProtocol: z.number().int().positive(),
      instanceId: z.string().min(1),
    })
    .optional(),
  /** The server's version is older than the app's (it updates itself daily from official releases). */
  serverOutdated: z.boolean().optional(),
  problem: z.object({ code: DesktopProblemCodeSchema, message: z.string() }).optional(),
})
export type DesktopConnection = z.infer<typeof DesktopConnectionSchema>

export const DesktopConnectInputSchema = z.object({
  /** host or host:port (SSH, default port 22). */
  address: z.string().min(1).max(255),
  /** SSH user on the server (the tunnel user). */
  user: z.string().min(1).max(64),
  /** The host token from `vibechat-server token new`; omitted to reuse the one in the keychain. */
  token: z.string().max(256).optional(),
})
export type DesktopConnectInput = z.infer<typeof DesktopConnectInputSchema>

/**
 * The setup wizard of a new server (level 1): the user enters the VPS address and the root password once; the app
 * runs these steps over SSH as root on a Debian 13 host, each one check → act → check, so a second run continues
 * where the first stopped. `POST /desktop/provision` starts a run (409 while one runs) and answers at once; `GET`
 * answers the progress. The root password lives only in the app's memory for the run; the host token goes to the
 * OS keychain; at the end the app connects like `PUT /desktop/connection` (local mode only: in the server's Studio
 * the routes are not answered).
 */
export const DESKTOP_PROVISION_STEPS = [
  "connect",
  "preflight",
  "incus",
  "container",
  "server",
  "egress",
  "token",
  "tunnel",
  "verify",
  "lockdown",
] as const
export const DesktopProvisionStepIdSchema = z.enum(DESKTOP_PROVISION_STEPS)
export type DesktopProvisionStepId = z.infer<typeof DesktopProvisionStepIdSchema>

export const DesktopProvisionStepStateSchema = z.enum(["pending", "running", "done", "skipped", "failed"])
export type DesktopProvisionStepState = z.infer<typeof DesktopProvisionStepStateSchema>

/** Why a run stopped: `unsupported` is preflight's refusal (not Debian 13 amd64, too small); `not_confirmed` means the
 * SSH lockdown was not confirmed and the server allows password login again within `rollbackSeconds`. */
export const DesktopProvisionProblemCodeSchema = z.enum([
  "unreachable",
  "auth",
  "host_key_changed",
  "unsupported",
  "step_failed",
  "not_confirmed",
  "bad_input",
  "busy",
])
export type DesktopProvisionProblemCode = z.infer<typeof DesktopProvisionProblemCodeSchema>

export const DesktopProvisionSchema = z.object({
  state: z.enum(["idle", "running", "done", "failed"]),
  /** Every step in DESKTOP_PROVISION_STEPS order. */
  steps: z.array(
    z.object({
      id: DesktopProvisionStepIdSchema,
      state: DesktopProvisionStepStateSchema,
      /** Why it failed (never a secret). */
      detail: z.string().optional(),
    }),
  ),
  /** The server of the current or last run. */
  address: z.string().optional(),
  /** SHA256 fingerprint of the server's pinned SSH host key, once connected. */
  hostKeyFingerprint: z.string().optional(),
  /** The lockdown safety net: password login comes back after this many seconds unless the app confirms. */
  rollbackSeconds: z.number().int().positive(),
  problem: z.object({ code: DesktopProvisionProblemCodeSchema, message: z.string() }).optional(),
})
export type DesktopProvision = z.infer<typeof DesktopProvisionSchema>

export const DesktopProvisionInputSchema = z.object({
  /** host or host:port of the VPS (SSH, default port 22). */
  address: z.string().min(1).max(255),
  /** The root password, used for this run only (never stored). */
  password: z.string().min(1).max(1024),
  /** An optional public key line of the user's own for root, installed before password login is turned off. */
  rootPublicKey: z.string().max(8192).optional(),
})
export type DesktopProvisionInput = z.infer<typeof DesktopProvisionInputSchema>

/** Default SSH user of the tunnel (port forwarding only, no shell). */
export const DESKTOP_TUNNEL_USER = "vibechat-tunnel" as const
