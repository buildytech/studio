import {
  type AgentCapabilities,
  type HostCapabilities,
} from "@buildy/agent-contract"
import { ApiError } from "../chat/banner"
import type { ExportableChatBundle } from "../chat/export-trace"
import type {
  AgentSession,
  AgentTranscriptMessage,
  CursorAccount,
  Project,
  PromptOutcome,
  RunFeedbackInput,
  Template,
  UserCredential,
  WorkspaceTreeNode,
} from "./types"

/**
 * How a HostClient reaches its host. The desktop build uses the same origin (`/runtime/v1`); a cloud build passes
 * its base URL and an auth hook. Tests pass a fake `fetch`.
 */
export type HostTransportConfig = {
  /** Seam root, e.g. `/runtime/v1` or `https://cloud.example/runtime/v1`. No trailing slash. */
  baseUrl: string
  fetch?: typeof fetch
  credentials?: RequestCredentials
  /** Extra headers per request (cloud auth). Never logged. */
  headers?: () => Record<string, string>
}

/** The Studio's only door to its host: one method per seam route (docs/adr/0002). */
export class HttpHostClient {
  private readonly baseUrl: string
  private readonly fetchImpl: typeof fetch
  private readonly credentials: RequestCredentials
  private readonly extraHeaders: () => Record<string, string>

  constructor(config: HostTransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    const f = config.fetch ?? globalThis.fetch
    this.fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) => f(input, init)) as typeof fetch
    this.credentials = config.credentials ?? "include"
    this.extraHeaders = config.headers ?? (() => ({}))
  }

  private headersFor(init?: HeadersInit): Headers {
    const headers = new Headers(init)
    for (const [k, v] of Object.entries(this.extraHeaders())) headers.set(k, v)
    return headers
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = this.headersFor(init.headers)
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json")
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: this.credentials,
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


  /** Desktop host capabilities (docs/adr/0002); UI branches on these, never on host name. */
  readonly hostCapabilities = () => this.request<HostCapabilities>("/host/capabilities")
  readonly cursorAccount = () =>
    this.request<{ account: CursorAccount }>("/me/cursor")
  readonly listMyCredentials = () =>
    this.request<{ credentials: UserCredential[] }>("/me/credentials")
  readonly putMyCredential = (runtime: string, providerId: string, key: string) =>
    this.request<{ credential: UserCredential }>(
      `/me/credentials/${encodeURIComponent(runtime)}/${encodeURIComponent(providerId)}`,
      { method: "PUT", body: JSON.stringify({ key }) },
    )
  readonly deleteMyCredential = (runtime: string, providerId: string) =>
    this.request<void>(
      `/me/credentials/${encodeURIComponent(runtime)}/${encodeURIComponent(providerId)}`,
      { method: "DELETE" },
    )
  readonly listTemplates = () => this.request<{ templates: Template[] }>("/templates")
  readonly listProjects = () => this.request<{ projects: Project[] }>("/projects")
  readonly createProject = (
    name: string,
    templateId?: string,
    agentRuntime?: "cursor-sdk",
  ) =>
    this.request<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify({
        name,
        templateId,
        ...(agentRuntime ? { agentRuntime } : {}),
      }),
    })
  readonly cloneProject = (id: string, name?: string) =>
    this.request<{ project: Project }>(`/projects/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(name ? { name } : {}),
    })
  readonly deleteProject = (id: string, confirmName: string) =>
    this.request<{ ok: boolean }>(`/projects/${id}/delete`, {
      method: "POST",
      body: JSON.stringify({ confirmName }),
    })
  readonly ensure = (id: string) =>
    this.request<{ status: string; previewUrl: string }>(`/projects/${id}/ensure`, { method: "POST" })
  readonly stop = (id: string) =>
    this.request<{ status: string }>(`/projects/${id}/stop`, { method: "POST" })
  readonly status = (id: string) =>
    this.request<{ status: string; previewUrl: string | null; ready?: boolean }>(
      `/projects/${id}/status`,
    )
  readonly previewGrant = (id: string) =>
    this.request<{ url: string; expiresAt: string }>(
      `/projects/${id}/preview/grant`,
      { method: "POST" },
    )
  /** Nested workspace tree for Studio Editor. */
  readonly listProjectFiles = (projectId: string) =>
    this.request<{ tree: WorkspaceTreeNode[] }>(
      `/projects/${encodeURIComponent(projectId)}/files`,
    )
  readonly readProjectFile = (projectId: string, filePath: string) =>
    this.request<{
      path: string
      content: string
      bytes: number
      encoding: "utf8"
    }>(
      `/projects/${encodeURIComponent(projectId)}/file?path=${encodeURIComponent(filePath)}`,
    )
  readonly writeProjectFile = (projectId: string, filePath: string, content: string) =>
    this.request<{ ok: boolean; path: string; bytes: number }>(
      `/projects/${encodeURIComponent(projectId)}/file`,
      {
        method: "PUT",
        body: JSON.stringify({ path: filePath, content }),
      },
    )
  readonly agentCapabilities = (projectId: string) =>
    this.request<AgentCapabilities>(`/projects/${projectId}/agent/capabilities`)
  readonly agentSessions = (projectId: string) =>
    this.request<{ sessions: AgentSession[] }>(`/projects/${projectId}/agent/sessions`)
  readonly createAgentSession = (projectId: string) =>
    this.request<{ session: AgentSession }>(`/projects/${projectId}/agent/sessions`, {
      method: "POST",
    })
  readonly deleteAgentSession = (projectId: string, sessionId: string) =>
    this.request<void>(`/projects/${projectId}/agent/sessions/${sessionId}`, {
      method: "DELETE",
    })
  /**
   * Send a prompt. cursor-sdk waits for the run and returns PromptOutcome (200);
   * async adapters may return 202 with `{ runId }` and stream text via SSE.
   */
  readonly promptAgent = async (
    projectId: string,
    sessionId: string,
    text: string,
    modelId: string,
    modelParams?: Array<{ id: string; value: string }>,
    clientMsgId?: string,
    images?: Array<{ mediaType: string; data: string }>,
  ): Promise<PromptOutcome | void> => {
    const headers = this.headersFor({ "Content-Type": "application/json" })
    const res = await this.fetchImpl(
      `${this.baseUrl}/projects/${projectId}/agent/sessions/${sessionId}/messages`,
      {
        method: "POST",
        headers,
        credentials: this.credentials,
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
  }
  /** Server transcript for a session (wins over the localStorage cache). */
  readonly agentTranscript = (projectId: string, sessionId: string, afterSeq?: number) => {
    const q =
      afterSeq !== undefined && afterSeq > 0
        ? `?after=${encodeURIComponent(String(afterSeq))}`
        : ""
    return this.request<{ messages: AgentTranscriptMessage[] }>(
      `/projects/${projectId}/agent/sessions/${sessionId}/messages${q}`,
    )
  }
  /** Portable chat bundle (buildy.chat.v1). Optional `trace` is client-attached. */
  readonly exportAgentSession = (projectId: string, sessionId: string) =>
    this.request<ExportableChatBundle>(
      `/projects/${projectId}/agent/sessions/${sessionId}/export`,
    )
  /** Product brief SPEC (buildy.brief.v1) — stack-agnostic rebuild contract. */
  readonly exportProjectBrief = (projectId: string) =>
    this.request<Record<string, unknown>>(`/projects/${projectId}/brief`)
  readonly importProjectBrief = (projectId: string, brief: unknown) =>
    this.request<{
      ok: boolean
      path: string
      identity: { id: string; name: string; docs?: string; tagline?: string }
      brief: Record<string, unknown>
    }>(`/projects/${projectId}/brief`, {
      method: "PUT",
      body: JSON.stringify(brief),
    })
  /** Vision: screenshot → filled buildy.brief.v1 written to workspace. */
  readonly briefFromImage = async (
    projectId: string,
    file: File,
    opts?: { modelId?: string },
  ) => {
    const body = new FormData()
    body.append("image", file)
    if (opts?.modelId?.trim()) body.append("model", opts.modelId.trim())
    const res = await this.fetchImpl(
      `${this.baseUrl}/projects/${encodeURIComponent(projectId)}/brief/from-image`,
      { method: "POST", body, headers: this.headersFor(), credentials: this.credentials },
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
  }
  /** Import bundle into a new session (rehydrate; no runtime resume). */
  readonly importAgentSession = (projectId: string, bundle: unknown) =>
    this.request<{
      session: AgentSession
      imported: boolean
      messageCount: number
    }>(`/projects/${projectId}/agent/import`, {
      method: "POST",
      body: JSON.stringify(bundle),
    })
  readonly runFeedback = (
    projectId: string,
    runId: string,
    input: RunFeedbackInput,
  ) =>
    this.request<{ ok: boolean }>(
      `/projects/${projectId}/agent/runs/${runId}/feedback`,
      { method: "POST", body: JSON.stringify(input) },
    )
  readonly abortAgent = (projectId: string, sessionId: string) =>
    this.request<void>(`/projects/${projectId}/agent/sessions/${sessionId}/abort`, {
      method: "POST",
    })
  /**
   * Open a gateway SSE stream via fetch so credentials (HttpOnly cookie) and
   * AbortSignal work cross-origin (EventSource cannot).
   */
  readonly openAgentEvents = async (
    projectId: string,
    sessionId: string,
    signal?: AbortSignal,
  ): Promise<ReadableStream<Uint8Array>> => {
    const res = await this.fetchImpl(
      `${this.baseUrl}/projects/${projectId}/agent/sessions/${sessionId}/events`,
      { headers: this.headersFor(), credentials: this.credentials, signal },
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
  }
}

/** The interface screens and stores depend on; `HttpHostClient` is its implementation. */
export type HostClient = Pick<HttpHostClient, keyof HttpHostClient>
