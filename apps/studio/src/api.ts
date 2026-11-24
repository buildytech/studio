/**
 * Compatibility surface of the Studio: types and helpers of the host seam, and `api`, the build's default
 * HostClient (docs/adr/0002). New code takes the client from `useHost()` (src/host/context.tsx).
 */
import type { Project, Template, User } from "./host"
import { createHostClient } from "./host"

export { ApiError } from "./chat/banner"
export type { AgentCapabilities, AgentChatUi, AgentEvent, AgentModel, HostCapabilities } from "@buildy/agent-contract"
export * from "./host/types"
export { readAgentEventStream, SSE_MAX_BUFFER_BYTES } from "./host"
export type { HostClient } from "./host"

/** The only user of a desktop Studio; scopes localStorage keys. */
export const LOCAL_USER: User = { id: "local", email: "", displayName: "Local" }

/** The default HostClient of this build. */
export const api = createHostClient()

/** Live preview host URL for a project (opens in a new tab). */
export function projectPreviewUrl(project: Pick<Project, "id" | "preview_url">): string {
  // The desktop host mints preview URLs (separate loopback origin + one-time
  // token, docs/adr/0002); there is no per-project preview subdomain any more.
  return project.preview_url ?? "about:blank"
}

/**
 * Strip `__buildy_grant` after the gateway exchange.
 * Grants expire in ~60s; leaving them in `iframe.src` makes Vite/HMR full
 * reloads hit an expired grant → 401 even though the session cookie is valid.
 */
export function previewUrlWithoutGrant(url: string): string {
  const parsed = new URL(url)
  if (!parsed.searchParams.has("__buildy_grant")) return url
  parsed.searchParams.delete("__buildy_grant")
  return `${parsed.origin}${parsed.pathname}${parsed.search}${parsed.hash}`
}

/** Drop legacy JWT copies left from pre-HttpOnly Studio clients. */
export function clearLegacyBrowserToken(): void {
  try {
    localStorage.removeItem("buildy_token")
  } catch {
    /* ignore */
  }
  try {
    document.cookie = "buildy_token=; Path=/; Max-Age=0; SameSite=Lax"
  } catch {
    /* ignore */
  }
}

export function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 48) return `${h}h ago`
  return new Date(iso).toLocaleDateString()
}

export function statusLabel(status: string): string {
  if (status === "running") return "Live"
  if (status === "starting" || status === "created") return "Starting"
  if (status === "stopped" || status === "exited" || status === "not_found") return "Stopped"
  return status
}

/** Stack badge label from template list (falls back to template id). */
export function stackLabel(templateId: string, templates: Template[]): string {
  return templates.find((t) => t.id === templateId)?.stack ?? templateId
}
