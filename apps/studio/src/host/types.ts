/**
 * Data shapes the host seam returns (docs/adr/0002). Contract types (events, capabilities, models) come from
 * @buildy/agent-contract; these are the JSON bodies of the seam routes.
 */
import type { PromptOutcome as ContractPromptOutcome } from "@buildy/agent-contract"

export type User = { id: string; email: string; displayName: string }

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
