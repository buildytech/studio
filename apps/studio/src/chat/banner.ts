/**
 * Map gateway / prompt failures to chat banner model (S2.4 / Slice A).
 * Auth / missing-key / model-deny → Settings CTA; 401 → re-auth copy.
 */

export type ChatBannerModel = {
  message: string
  tone: "danger" | "warn"
  /** When set, banner shows a link to Studio Settings. */
  settingsHref?: string
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

/** Permanent HTTP failures must not trigger SSE reconnect loops. */
export function isTerminalSseError(err: unknown): boolean {
  return (
    err instanceof ApiError
    && (err.status === 401 || err.status === 403 || err.status === 404)
  )
}

export function classifyChatError(err: unknown): ChatBannerModel {
  const status = err instanceof ApiError ? err.status : undefined
  let message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Something went wrong"

  if (status === 401) {
    message = "Session expired. Sign in again."
  }

  const lower = message.toLowerCase()
  const reconnecting = lower.includes("reconnect")
  const needsSettings =
    status === 503
    || lower.includes("settings")
    || lower.includes("api key")
    || lower.includes("no key")
    || lower.includes("credential")
    || lower.includes("not configured")
  const modelDenied =
    status === 403
    || (lower.includes("model")
      && (lower.includes("allow") || lower.includes("not allowed") || lower.includes("forbidden")))

  return {
    message,
    tone: reconnecting ? "warn" : "danger",
    settingsHref: needsSettings || modelDenied ? "/settings" : undefined,
  }
}

/** Soft stream lifecycle banners (S2.2). */
export function streamReconnectBanner(detail: string): ChatBannerModel {
  return {
    message: detail.startsWith("Event stream:")
      ? detail
      : `Event stream: ${detail} (reconnecting…)`,
    tone: "warn",
  }
}

export function streamCaughtUpBanner(): ChatBannerModel {
  return {
    message: "Event stream: reconnected",
    tone: "warn",
  }
}
