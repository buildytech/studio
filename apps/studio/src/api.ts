import {
  AgentEventSchema,
  HOST_SEAM_PREFIX,
  type AgentCapabilities,
  type AgentChatUi,
  type AgentEvent,
  type AgentModel,
  type HostCapabilities,
  type PromptOutcome as ContractPromptOutcome,
} from "@buildy/agent-contract"
import { ApiError } from "./chat/banner"
import type { ExportableChatBundle } from "./chat/export-trace"

export { ApiError } from "./chat/banner"

/** Max accumulated SSE bytes before a delimiter (Slice A / finding 4). */
export const SSE_MAX_BUFFER_BYTES = 1_048_576

/**
 * Same-origin by default: the desktop host (vibechat-desktop) serves this
 * bundle and answers the host seam under `HOST_SEAM_PREFIX` (`/runtime/v1`)
 * on the same origin (docs/adr/0002). `VITE_API_URL` only points a dev server at a
 * running host.
 */
const API_URL = import.meta.env.VITE_API_URL || HOST_SEAM_PREFIX

export type { AgentCapabilities, AgentChatUi, AgentEvent, AgentModel, HostCapabilities }

export type User = { id: string; email: string; displayName: string }

/** The only user of a desktop Studio; scopes localStorage keys. */
export const LOCAL_USER: User = { id: "local", email: "", displayName: "Local" }
export type UserCredential = {
  runtime: string
  providerId: string
  hint: string
  masked: string
  createdAt: string
  updatedAt: string
}
export type CursorAccount = {
  firstName: string | null
  lastName: string | null
  displayName: string | null
  email: string | null
  apiKeyName: string | null
}

export type Template = {
  id: string
  name: string
  stack: string
  description: string
  enabled: boolean
}
export type Project = {
  id: string
  name: string
  status: string
  preview_url: string | null
  template_id: string
  created_at: string
  updated_at: string
}

/** Nested workspace tree node from GET /projects/:id/files. */
export type WorkspaceTreeNode = {
  name: string
  path: string
  type: "file" | "dir"
  children?: WorkspaceTreeNode[]
}
export type AgentSession = {
  id: string
  projectId: string
  userId: string
  runtime: string
  status: "queued" | "running" | "idle" | "error"
  title?: string | null
  lastMessageAt?: string | null
  createdAt: string
  updatedAt: string
}

/** Gateway prompt response: contract outcome + runId (+ optional running). */
export type PromptOutcome = Omit<ContractPromptOutcome, "status"> & {
  status: "idle" | "error" | "running"
  /** agent_runs row id for this prompt (feedback target). */
  runId?: string
}

export type RunFeedbackInput = {
  rating: "up" | "down"
  tags?: string[]
  comment?: string
}

/** One server-transcript row (source of truth for chat history, E1). */
export type AgentTranscriptMessage = {
  id: string
  sessionId: string
  runId: string | null
  role: "user" | "assistant"
  content: string
  /** Monotonic per-session sequence (chat history P1). */
  seq?: number
  createdAt: string
  /** Set when this user already rated the run — latch UI after reload. */
  feedback?: "up" | "down"
}

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

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const msg =
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : `HTTP ${res.status}`
    throw new ApiError(res.status, msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Parse an SSE byte stream from the Agent Gateway into contract events. */
export async function* readAgentEventStream(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  try {
    while (true) {
      if (signal?.aborted) break
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      if (buffer.length > SSE_MAX_BUFFER_BYTES) {
        throw new ApiError(502, "Event stream: frame too large")
      }
      let sep: number
      while ((sep = buffer.indexOf("\n\n")) >= 0) {
        const chunk = buffer.slice(0, sep)
        buffer = buffer.slice(sep + 2)
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data:")) continue
          const raw = line.slice(5).trim()
          if (!raw || raw === "[DONE]") continue
          try {
            const json: unknown = JSON.parse(raw)
            const parsed = AgentEventSchema.safeParse(json)
            if (parsed.success) yield parsed.data
          } catch {
            /* drop malformed frames */
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export const api = {
  /** Desktop host capabilities (docs/adr/0002); UI branches on these, never on host name. */
  hostCapabilities: () => request<HostCapabilities>("/host/capabilities"),
  cursorAccount: () =>
    request<{ account: CursorAccount }>("/me/cursor"),
  listMyCredentials: () =>
    request<{ credentials: UserCredential[] }>("/me/credentials"),
  putMyCredential: (runtime: string, providerId: string, key: string) =>
    request<{ credential: UserCredential }>(
      `/me/credentials/${encodeURIComponent(runtime)}/${encodeURIComponent(providerId)}`,
      { method: "PUT", body: JSON.stringify({ key }) },
    ),
  deleteMyCredential: (runtime: string, providerId: string) =>
    request<void>(
      `/me/credentials/${encodeURIComponent(runtime)}/${encodeURIComponent(providerId)}`,
      { method: "DELETE" },
    ),
  listTemplates: () => request<{ templates: Template[] }>("/templates"),
  listProjects: () => request<{ projects: Project[] }>("/projects"),
  createProject: (
    name: string,
    templateId?: string,
    agentRuntime?: "cursor-sdk",
  ) =>
    request<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify({
        name,
        templateId,
        ...(agentRuntime ? { agentRuntime } : {}),
      }),
    }),
  cloneProject: (id: string, name?: string) =>
    request<{ project: Project }>(`/projects/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(name ? { name } : {}),
    }),
  deleteProject: (id: string, confirmName: string) =>
    request<{ ok: boolean }>(`/projects/${id}/delete`, {
      method: "POST",
      body: JSON.stringify({ confirmName }),
    }),
  ensure: (id: string) =>
    request<{ status: string; previewUrl: string }>(`/projects/${id}/ensure`, { method: "POST" }),
  stop: (id: string) =>
    request<{ status: string }>(`/projects/${id}/stop`, { method: "POST" }),
  status: (id: string) =>
    request<{ status: string; previewUrl: string | null; ready?: boolean }>(
      `/projects/${id}/status`,
    ),
  previewGrant: (id: string) =>
    request<{ url: string; expiresAt: string }>(
      `/projects/${id}/preview/grant`,
      { method: "POST" },
    ),
  /** Nested workspace tree for Studio Editor. */
  listProjectFiles: (projectId: string) =>
    request<{ tree: WorkspaceTreeNode[] }>(
      `/projects/${encodeURIComponent(projectId)}/files`,
    ),
  readProjectFile: (projectId: string, filePath: string) =>
    request<{
      path: string
      content: string
      bytes: number
      encoding: "utf8"
    }>(
      `/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(filePath)}`,
    ),
  writeProjectFile: (projectId: string, filePath: string, content: string) =>
    request<{ ok: boolean; path: string; bytes: number }>(
      `/projects/${encodeURIComponent(projectId)}/file`,
      {
        method: "PUT",
        body: JSON.stringify({ path: filePath, content }),
      },
    ),
  agentCapabilities: (projectId: string) =>
    request<AgentCapabilities>(`/projects/${projectId}/agent/capabilities`),
  agentSessions: (projectId: string) =>
    request<{ sessions: AgentSession[] }>(`/projects/${projectId}/agent/sessions`),
  createAgentSession: (projectId: string) =>
    request<{ session: AgentSession }>(`/projects/${projectId}/agent/sessions`, {
      method: "POST",
    }),
  deleteAgentSession: (projectId: string, sessionId: string) =>
    request<void>(`/projects/${projectId}/agent/sessions/${sessionId}`, {
      method: "DELETE",
    }),
  /**
   * Send a prompt. cursor-sdk waits for the run and returns PromptOutcome (200);
   * async adapters may return 202 with `{ runId }` and stream text via SSE.
   */
  promptAgent: async (
    projectId: string,
    sessionId: string,
    text: string,
    modelId: string,
    modelParams?: Array<{ id: string; value: string }>,
    clientMsgId?: string,
    images?: Array<{ mediaType: string; data: string }>,
  ): Promise<PromptOutcome | void> => {
    const headers = new Headers({ "Content-Type": "application/json" })
    const res = await fetch(
      `${API_URL}/projects/${projectId}/agent/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({
          text,
          modelId,
          ...(modelParams?.length ? { modelParams } : {}),
          ...(clientMsgId ? { clientMsgId } : {}),
          ...(images?.length ? { images } : {}),
        }),
      },
    )
    const body = await res.json().catch(() => ({}))
    if (res.status === 202 || res.status === 204) {
      const runId =
        typeof (body as { runId?: unknown }).runId === "string"
          ? (body as { runId: string }).runId
          : undefined
      const evidence = (body as { evidence?: PromptOutcome["evidence"] }).evidence
      if (runId) {
        return {
          status: "running",
          text: "",
          runId,
          ...(evidence ? { evidence } : {}),
        }
      }
      return
    }
    if (!res.ok) {
      throw new ApiError(
        res.status,
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : `HTTP ${res.status}`,
      )
    }
    return body as PromptOutcome
  },
  /** Server transcript for a session (wins over the localStorage cache). */
  agentTranscript: (projectId: string, sessionId: string, afterSeq?: number) => {
    const q =
      afterSeq !== undefined && afterSeq > 0
        ? `?after=${encodeURIComponent(String(afterSeq))}`
        : ""
    return request<{ messages: AgentTranscriptMessage[] }>(
      `/projects/${projectId}/agent/sessions/${sessionId}/messages${q}`,
    )
  },
  /** Portable chat bundle (buildy.chat.v1). Optional `trace` is client-attached. */
  exportAgentSession: (projectId: string, sessionId: string) =>
    request<ExportableChatBundle>(
      `/projects/${projectId}/agent/sessions/${sessionId}/export`,
    ),
  /** Product brief SPEC (buildy.brief.v1) — stack-agnostic rebuild contract. */
  exportProjectBrief: (projectId: string) =>
    request<Record<string, unknown>>(`/projects/${projectId}/brief`),
  importProjectBrief: (projectId: string, brief: unknown) =>
    request<{
      ok: boolean
      path: string
      identity: { id: string; name: string; docs?: string; tagline?: string }
      brief: Record<string, unknown>
    }>(`/projects/${projectId}/brief`, {
      method: "PUT",
      body: JSON.stringify(brief),
    }),
  /** Vision: screenshot → filled buildy.brief.v1 written to workspace. */
  briefFromImage: async (
    projectId: string,
    file: File,
    opts?: { modelId?: string },
  ) => {
    const body = new FormData()
    body.append("image", file)
    if (opts?.modelId?.trim()) body.append("model", opts.modelId.trim())
    const res = await fetch(
      `${API_URL}/projects/${encodeURIComponent(projectId)}/brief/from-image`,
      { method: "POST", body, credentials: "include" },
    )
    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      const msg =
        typeof (json as { error?: unknown }).error === "string"
          ? (json as { error: string }).error
          : `HTTP ${res.status}`
      throw new ApiError(res.status, msg)
    }
    return res.json() as Promise<{
      ok: boolean
      path: string
      provider: string
      model?: string
      identity: { id: string; name: string; docs?: string; tagline?: string }
      brief: Record<string, unknown>
    }>
  },
  /** Import bundle into a new session (rehydrate; no runtime resume). */
  importAgentSession: (projectId: string, bundle: unknown) =>
    request<{
      session: AgentSession
      imported: boolean
      messageCount: number
    }>(`/projects/${projectId}/agent/import`, {
      method: "POST",
      body: JSON.stringify(bundle),
    }),
  runFeedback: (
    projectId: string,
    runId: string,
    input: RunFeedbackInput,
  ) =>
    request<{ ok: boolean }>(
      `/projects/${projectId}/agent/runs/${runId}/feedback`,
      { method: "POST", body: JSON.stringify(input) },
    ),
  abortAgent: (projectId: string, sessionId: string) =>
    request<void>(`/projects/${projectId}/agent/sessions/${sessionId}/abort`, {
      method: "POST",
    }),
  /**
   * Open a gateway SSE stream via fetch so credentials (HttpOnly cookie) and
   * AbortSignal work cross-origin (EventSource cannot).
   */
  openAgentEvents: async (
    projectId: string,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> => {
    const res = await fetch(
      `${API_URL}/projects/${projectId}/agent/sessions/${sessionId}/events`,
      { credentials: "include", signal },
    )
    if (!res.ok || !res.body) {
      const body = await res.json().catch(() => ({}))
      throw new ApiError(
        res.status,
        typeof (body as { error?: unknown }).error === "string"
          ? (body as { error: string }).error
          : `HTTP ${res.status}`,
      )
    }
    return res.body
  },
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
