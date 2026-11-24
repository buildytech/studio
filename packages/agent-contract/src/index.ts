/**
 * Agent Contract v1 — SSoT package (`@buildy/agent-contract`).
 * Additive-only: never rename/remove fields or event types (AGENTS.md).
 * UI and adapters both import from here so runtime specifics never leak.
 */

import { z } from "zod"

export const AGENT_CONTRACT_VERSION = "1" as const

/**
 * Server-authored context handed to every adapter call. The adapter cannot widen
 * its own scope: workspace and the model allowlist come from the gateway, so a
 * runtime physically cannot touch another tenant's files or pick a model the
 * tenant's plan does not permit.
 */
export type TenantCtx = {
  userId: string
  projectId: string
  /** Absolute workspace path the runtime is bound to. */
  workspacePath: string
  /** Model ids the caller's plan allows; the gateway rejects anything else. */
  modelAllowlist: string[]
}

/** Normalized session lifecycle status shared across runtimes. */
export const SessionStatusSchema = z.enum([
  "queued",
  "running",
  "idle",
  "error",
])
export type SessionStatus = z.infer<typeof SessionStatusSchema>

/** Cursor SDK updateTodos item statuses (camelCase as emitted by the SDK). */
export const AgentTodoStatusSchema = z.enum([
  "pending",
  "inProgress",
  "completed",
  "cancelled",
])
export type AgentTodoStatus = z.infer<typeof AgentTodoStatusSchema>

export const AgentTodoItemSchema = z.object({
  content: z.string().min(1),
  status: AgentTodoStatusSchema,
})
export type AgentTodoItem = z.infer<typeof AgentTodoItemSchema>

/**
 * Normalized bus events streamed to the UI over SSE. Adapters translate their
 * runtime's native events into this closed set; unknown native events are
 * dropped rather than forwarded raw.
 */
/** Gateway-generated run correlation id, stamped on events by adapters (E1). */
const runIdField = { runId: z.string().min(1).optional() }

/** Optional structured todos from Cursor `updateTodos` (additive). */
const todosField = {
  todos: z.array(AgentTodoItemSchema).max(200).optional(),
}

export const AgentEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("message.delta"),
    sessionId: z.string().min(1),
    role: z.literal("assistant"),
    text: z.string(),
    ...runIdField,
  }),
  z.object({
    type: z.literal("thinking.delta"),
    sessionId: z.string().min(1),
    text: z.string(),
    ...runIdField,
  }),
  z.object({
    type: z.literal("thinking.completed"),
    sessionId: z.string().min(1),
    durationMs: z.number().int().nonnegative().optional(),
    ...runIdField,
  }),
  z.object({
    type: z.literal("tool.started"),
    sessionId: z.string().min(1),
    tool: z.string().min(1),
    /** One-line command / path for the Studio terminal card header. */
    summary: z.string().optional(),
    /** Scrollable body (stdout, meta). */
    detail: z.string().optional(),
    /** Coarse UI kind: shell | search | agent | file | mcp | tool. */
    kind: z.string().min(1).optional(),
    /** Runtime tool call id for correlating started/finished/delta. */
    callId: z.string().min(1).optional(),
    ...todosField,
    ...runIdField,
  }),
  z.object({
    type: z.literal("tool.finished"),
    sessionId: z.string().min(1),
    tool: z.string().min(1),
    summary: z.string().optional(),
    detail: z.string().optional(),
    kind: z.string().min(1).optional(),
    callId: z.string().min(1).optional(),
    ...todosField,
    ...runIdField,
  }),
  /**
   * Streaming body append for an in-flight tool (e.g. shell stdout chunks).
   * Additive — adapters without streaming output omit this event.
   */
  z.object({
    type: z.literal("tool.delta"),
    sessionId: z.string().min(1),
    tool: z.string().min(1),
    text: z.string(),
    callId: z.string().min(1).optional(),
    ...runIdField,
  }),
  z.object({
    // Signals the preview should reload; replaces the raw session.idle listener.
    type: z.literal("files.changed"),
    sessionId: z.string().min(1),
    paths: z.array(z.string()).default([]),
    ...runIdField,
  }),
  z.object({
    type: z.literal("session.status"),
    sessionId: z.string().min(1),
    status: SessionStatusSchema,
    ...runIdField,
  }),
  z.object({
    type: z.literal("usage"),
    sessionId: z.string().min(1),
    tokensIn: z.number().int().nonnegative(),
    tokensOut: z.number().int().nonnegative(),
    /** Prompt-cache reads (Cursor SDK TokenUsage.cacheReadTokens). */
    cacheReadTokens: z.number().int().nonnegative().optional(),
    /** Prompt-cache writes (Cursor SDK TokenUsage.cacheWriteTokens). */
    cacheWriteTokens: z.number().int().nonnegative().optional(),
    /** Reasoning / thinking tokens when reported. */
    reasoningTokens: z.number().int().nonnegative().optional(),
    /**
     * Cumulative tokens when reported (Cursor: excludes reasoning from total).
     */
    totalTokens: z.number().int().nonnegative().optional(),
    /**
     * USD cost for the run when the runtime reports it (Pi `cost.total`).
     * Cursor SDK exposes tokens only — no fabricated rates.
     */
    costUsd: z.number().nonnegative().optional(),
    ...runIdField,
  }),
  /**
   * Gateway-selected evidence pack for this prompt (paths/spans, not full RAG).
   * Emitted before or with the run so Studio can show “used N files”.
   */
  z.object({
    type: z.literal("evidence.used"),
    sessionId: z.string().min(1),
    paths: z.array(z.string()).default([]),
    /** Total characters injected into the adapter prompt. */
    chars: z.number().int().nonnegative(),
    files: z.number().int().nonnegative(),
    ...runIdField,
  }),
])
export type AgentEvent = z.infer<typeof AgentEventSchema>

/** Token / cost breakdown shared by usage events and PromptOutcome. */
export type TokenUsageBreakdown = {
  tokensIn: number
  tokensOut: number
  cacheReadTokens?: number
  cacheWriteTokens?: number
  reasoningTokens?: number
  totalTokens?: number
}

/** Gateway-authored evidence summary returned on prompt HTTP responses. */
export type EvidenceSummary = {
  paths: string[]
  chars: number
  files: number
}

/** A model the UI may offer for a project, derived from the BuildY catalog. */
export const AgentModelSchema = z.object({
  id: z.string().min(1),
  provider: z.string().min(1),
  label: z.string().min(1),
})
export type AgentModel = z.infer<typeof AgentModelSchema>

/**
 * What a runtime can do, negotiated so the UI hides features an adapter lacks
 * (e.g. no PTY terminal) instead of failing at call time.
 */
/** Chat live-trace prefs (env today → Studio settings later). */
export const AgentChatUiSchema = z.object({
  showThinking: z.boolean(),
  showToolTrace: z.boolean(),
})
export type AgentChatUi = z.infer<typeof AgentChatUiSchema>

export const AgentCapabilitiesSchema = z.object({
  runtime: z.string().min(1),
  /**
   * Human label for the runtime badge (e.g. "Cursor"). The UI must render
   * this instead of branching on the runtime name (E0 web gate).
   */
  runtimeLabel: z.string().min(1).optional(),
  streaming: z.boolean(),
  tools: z.boolean(),
  pty: z.boolean(),
  snapshots: z.boolean(),
  /** When true, runtime reports dollar cost on PromptOutcome / agent_runs. */
  cost_usage: z.boolean().optional(),
  /**
   * When true, Gateway may attach a budgeted evidence pack to prompts
   * (Studio may show “used N files”; no runtime branching).
   */
  evidence_pack: z.boolean().optional(),
  /**
   * When true, the runtime registers named SDK subagents the main agent can
   * spawn (e.g. Cursor AgentOptions.agents). UI must not branch on runtime name.
   */
  subagents: z.boolean().optional(),
  models: z.array(AgentModelSchema),
  ui: AgentChatUiSchema.optional(),
})
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>

/** Optional SDK model params (effort, fast, …) for parameterized Cursor models. */
export const ModelParamSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
})
export type ModelParam = z.infer<typeof ModelParamSchema>

/** Max prompt body size (chars). Oversize → 400 from the gateway. */
export const PROMPT_TEXT_MAX = 32_000

/** Max decoded image size for a single prompt attachment. */
export const PROMPT_IMAGE_MAX_BYTES = 4 * 1024 * 1024

/** Max images per prompt (Cursor SDK vision). */
export const PROMPT_IMAGES_MAX = 4

/** Max base64 chars for one image (~4 MiB decoded). */
export const PROMPT_IMAGE_DATA_MAX_CHARS =
  Math.ceil(PROMPT_IMAGE_MAX_BYTES / 3) * 4

export const PromptImageMediaTypeSchema = z.enum([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

/** Optional vision attachment on a prompt (additive; Cursor SDK images). */
export const PromptImageSchema = z.object({
  mediaType: PromptImageMediaTypeSchema,
  /** Raw base64 payload (no `data:` URL prefix). */
  data: z.string().min(1).max(PROMPT_IMAGE_DATA_MAX_CHARS),
})
export type PromptImage = z.infer<typeof PromptImageSchema>

/** Prompt payload accepted by the gateway; model must be in the allowlist. */
export const PromptInputSchema = z.object({
  text: z.string().min(1).max(PROMPT_TEXT_MAX),
  modelId: z.string().min(1),
  modelParams: z.array(ModelParamSchema).optional(),
  /**
   * Optional client-generated id for idempotent user-message append
   * (chat history P1). Retries with the same id do not duplicate rows.
   */
  clientMsgId: z.string().min(1).max(128).optional(),
  /**
   * Optional screenshots / reference images for vision-capable runtimes
   * (Cursor SDK `SDKUserMessage.images`). Unsupported runtimes ignore.
   */
  images: z.array(PromptImageSchema).max(PROMPT_IMAGES_MAX).optional(),
})
export type PromptInput = z.infer<typeof PromptInputSchema>

/** Opaque reference to a runtime session. */
export const SessionRefSchema = z.object({
  sessionId: z.string().min(1),
})
export type SessionRef = z.infer<typeof SessionRefSchema>

/**
 * Optional synchronous outcome when an adapter awaits the full run (cursor-sdk).
 * Async adapters return void and stream only via SSE.
 */
export type PromptOutcome = {
  status: "idle" | "error"
  /** Aggregated assistant text for the run (SSE may have streamed the same). */
  text: string
  error?: string
  usage?: TokenUsageBreakdown
  /** Estimated USD cost for the run (agent_runs.cost_estimate, E3 / pi-sdk). */
  costEstimate?: number
  /** Tool invocations observed during the run (agent_runs metric, E1). */
  toolCalls?: number
  /** Files touched during the run (agent_runs metric, E1). */
  filesChanged?: number
  /** Gateway evidence pack summary (also on HTTP response / evidence.used). */
  evidence?: EvidenceSummary
}

/**
 * Server-authored per-prompt options. runId is generated by the gateway
 * (never client-supplied — PromptInputSchema stays unchanged) so events and
 * agent_runs rows correlate.
 */
export type PromptOpts = {
  runId?: string
  /** Gateway-owned cancellation (abort, timeout, shutdown). */
  signal?: AbortSignal
}

/**
 * The interface every agent runtime implements. The gateway owns auth, project
 * scope, model allowlist enforcement and secret injection; adapters only
 * translate to and from their runtime.
 */
export interface AgentAdapter {
  /** Static-ish description of the runtime + the models it may serve. */
  capabilities(ctx: TenantCtx): Promise<AgentCapabilities>
  createSession(ctx: TenantCtx): Promise<SessionRef>
  /**
   * Start a prompt. May return void (async runtime + SSE only) or a
   * PromptOutcome when the adapter waits for the run to finish.
   * `opts.runId` (gateway-generated) must be stamped on every bus event.
   */
  prompt(
    ctx: TenantCtx,
    sessionId: string,
    input: PromptInput,
    opts?: PromptOpts,
  ): Promise<PromptOutcome | void>
  abort(ctx: TenantCtx, sessionId: string): Promise<void>
  /**
   * Drop in-memory session state (bus + handles). Optional — adapters without
   * a process-local Map may omit this.
   */
  evictSession?(ctx: TenantCtx, sessionId: string): Promise<void>
  /**
   * Normalized event stream for one session.
   * Pass the request AbortSignal so disconnect drops the subscriber immediately.
   */
  events(
    ctx: TenantCtx,
    sessionId: string,
    signal?: AbortSignal,
  ): AsyncIterable<AgentEvent>
}

export * from "./host"
