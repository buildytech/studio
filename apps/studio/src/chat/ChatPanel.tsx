import {
  Show,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js"
import {
  EMPTY_AGENT_TITLE,
  getActiveSessionId,
  hasChatHistory,
  loadChat,
  loadModelId,
  removeChatCache,
  saveChat,
  saveModelId,
  setActiveSessionId,
  type CachedChatMessage,
} from "../chat-store"
import {
  api,
  readAgentEventStream,
  type AgentCapabilities,
  type AgentEvent,
  type AgentSession,
} from "../api"
import {
  ApiError,
  classifyChatError,
  isTerminalSseError,
  streamCaughtUpBanner,
  streamReconnectBanner,
  type ChatBannerModel,
} from "./banner"
import { ChatBanner } from "./ChatBanner"
import { ChatComposer } from "./ChatComposer"
import { ChatMessageList } from "./ChatMessageList"
import { ChatTabs } from "./ChatTabs"
import { ChatTodosPanel } from "./ChatTodosPanel"
import { ChatToolbar, type AgentUiStatus } from "./ChatToolbar"
import { nextMessageId, shortSessionLabel } from "./labels"
import {
  withExportExtras,
  traceFromUiMessages,
} from "./export-trace"
import {
  ensureExportIncludeTraceDefault,
  readExportIncludeTrace,
} from "../chat-export-prefs"
import {
  GROK_ID,
  OPUS_ID,
  grokModelParams,
  loadGrokOptions,
  loadOpusOptions,
  opusModelParams,
  saveGrokOptions,
  saveOpusOptions,
  type GrokOptions,
  type OpusOptions,
} from "./ModelSelect"
import { shouldReplaceEmptySession } from "./import-replace"
import {
  BRIEF_REBUILD_STARTER,
  SCREENSHOT_ATTACH_STARTER,
} from "./ChatMessageList"
import type { ComposerAttachment } from "./ChatComposer"
import {
  ensureRuntimeSession,
  selectVisibleSessions,
} from "./session-bootstrap"
import {
  loadSessionTodos,
  saveSessionTodos,
} from "./session-todos"
import type { AgentTodoItem } from "@buildy/agent-contract"
import { Box, Input } from "../primitives"
import { changedCalls, upsertToolRows } from "./tools/rows"
import { createToolState, reduceToolEvent, type ToolState } from "./tools/model"

type ChatMessage = CachedChatMessage

export type ChatPanelProps = {
  userId: string
  projectId: string
  /** Collapse chat pane (Studio full-width Editor/Preview). */
  onCollapse?: () => void
  /** Optional side-channel for gateway events (preview remount must not use this). */
  onAgentEvent?: (event: AgentEvent) => void
}

export function ChatPanel(props: ChatPanelProps): JSX.Element {
  ensureExportIncludeTraceDefault()
  const [capabilities, setCapabilities] = createSignal<AgentCapabilities | null>(null)
  const [sessions, setSessions] = createSignal<AgentSession[]>([])
  const [session, setSession] = createSignal<AgentSession | null>(null)
  const [modelId, setModelId] = createSignal("")
  const [grok, setGrok] = createSignal<GrokOptions>(loadGrokOptions(props.userId))
  const [opus, setOpus] = createSignal<OpusOptions>(loadOpusOptions(props.userId))
  createEffect(() => {
    setGrok(loadGrokOptions(props.userId))
    setOpus(loadOpusOptions(props.userId))
  })
  /** Sticky agent todo list from Cursor updateTodos (sessionStorage-backed). */
  const [sessionTodos, setSessionTodos] = createSignal<AgentTodoItem[]>([])
  const [todosCollapsed, setTodosCollapsed] = createSignal(false)
  const [todosHidden, setTodosHidden] = createSignal(false)

  const applySessionTodos = (
    sessionId: string,
    todos: AgentTodoItem[],
  ) => {
    setSessionTodos(todos)
    setTodosHidden(false)
    saveSessionTodos(props.userId, props.projectId, sessionId, todos)
  }

  const loadTodosForSession = (sessionId: string) => {
    setSessionTodos(loadSessionTodos(props.userId, props.projectId, sessionId))
    setTodosCollapsed(false)
    setTodosHidden(false)
  }
  /** Per-session composer drafts — survive tab switches until send/close. */
  const [draftBySession, setDraftBySession] = createSignal<Record<string, string>>(
    {},
  )
  const [messages, setMessages] = createSignal<ChatMessage[]>([])
  const [tabTitles, setTabTitles] = createSignal<Record<string, string>>({})

  const draft = () => {
    const sid = session()?.id
    if (!sid) return ""
    return draftBySession()[sid] ?? ""
  }
  const setDraft = (text: string) => {
    const sid = session()?.id
    if (!sid) return
    setDraftBySession((prev) => {
      if ((prev[sid] ?? "") === text) return prev
      return { ...prev, [sid]: text }
    })
  }
  const clearDraftFor = (sessionId: string) => {
    setDraftBySession((prev) => {
      if (!(sessionId in prev)) return prev
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
  }
  const pendingAttachment = ():
    | (ComposerAttachment & { mediaType: string; data: string })
    | null => {
    const sid = session()?.id
    if (!sid) return null
    return attachmentBySession()[sid] ?? null
  }
  const clearAttachmentFor = (sessionId: string) => {
    setAttachmentBySession((prev) => {
      const cur = prev[sessionId]
      if (!cur) return prev
      if (cur.previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(cur.previewUrl)
      }
      const next = { ...prev }
      delete next[sessionId]
      return next
    })
  }
  const clearPendingAttachment = () => {
    const sid = session()?.id
    if (sid) clearAttachmentFor(sid)
  }
  const [agentStatus, setAgentStatus] = createSignal<AgentUiStatus>("idle")
  const [tools, setTools] = createSignal<string[]>([])
  const [lastUsage, setLastUsage] = createSignal<{
    tokensIn: number
    tokensOut: number
    cacheReadTokens?: number
    cacheWriteTokens?: number
    reasoningTokens?: number
    totalTokens?: number
    costUsd?: number
  } | null>(null)
  const [lastEvidenceFiles, setLastEvidenceFiles] = createSignal<number | null>(
    null,
  )
  const [banner, setBanner] = createSignal<ChatBannerModel | null>(null)
  const [bootstrapping, setBootstrapping] = createSignal(true)
  const [importedIds, setImportedIds] = createSignal<Set<string>>(new Set())
  const [dropActive, setDropActive] = createSignal(false)
  let scrollEl: HTMLElement | undefined
  let importInput: HTMLInputElement | undefined
  let briefImportInput: HTMLInputElement | undefined
  let visionImportInput: HTMLInputElement | undefined
  /** Pending screenshot per session (bytes stay in memory until send). */
  const [attachmentBySession, setAttachmentBySession] = createSignal<
    Record<
      string,
      ComposerAttachment & { mediaType: string; data: string }
    >
  >({})
  let eventsAbort: AbortController | undefined
  let eventsReady: Promise<void> = Promise.resolve()
  let eventsReadyResolve: (() => void) | undefined
  let caughtUpTimer: ReturnType<typeof setTimeout> | undefined
  let dropDepth = 0

  const clearBanner = () => setBanner(null)
  const showError = (err: unknown) => setBanner(classifyChatError(err))

  const activeId = createMemo(() => session()?.id ?? "")

  const stampRunId = (runId: string) => {
    setMessages((prev) => {
      for (let i = prev.length - 1; i >= 0; i -= 1) {
        const m = prev[i]!
        if (m.role === "assistant") {
          if (m.runId === runId) return prev
          const next = prev.slice()
          next[i] = { ...m, runId }
          return next
        }
      }
      return [
        ...prev,
        {
          id: nextMessageId("a"),
          role: "assistant" as const,
          text: "",
          streaming: true,
          runId,
        },
      ]
    })
  }

  const applyPromptOutcome = (outcome: {
    status: "idle" | "error" | "running"
    text: string
    error?: string
    usage?: {
      tokensIn: number
      tokensOut: number
      cacheReadTokens?: number
      cacheWriteTokens?: number
      reasoningTokens?: number
      totalTokens?: number
    }
    costEstimate?: number
    evidence?: { paths: string[]; chars: number; files: number }
    runId?: string
  }) => {
    if (outcome.runId) stampRunId(outcome.runId)
    if (outcome.evidence) {
      setLastEvidenceFiles(outcome.evidence.files)
    }
    if (outcome.status === "running") return
    if (outcome.text) {
      setMessages((prev) => {
        const last = prev[prev.length - 1]
        if (last?.role === "assistant") {
          const text =
            last.text.length >= outcome.text.length ? last.text : outcome.text
          return [
            ...prev.slice(0, -1),
            {
              ...last,
              text,
              streaming: false,
              runId: outcome.runId ?? last.runId,
            },
          ]
        }
        return [
          ...prev,
          {
            id: nextMessageId("a"),
            role: "assistant" as const,
            text: outcome.text,
            streaming: false,
            runId: outcome.runId,
          },
        ]
      })
      persistCurrent()
    } else {
      finishAssistant()
    }
    setAgentStatus(outcome.status === "error" ? "error" : "idle")
    if (outcome.usage || outcome.costEstimate !== undefined) {
      setLastUsage((prev) => ({
        tokensIn: outcome.usage?.tokensIn ?? prev?.tokensIn ?? 0,
        tokensOut: outcome.usage?.tokensOut ?? prev?.tokensOut ?? 0,
        ...(outcome.usage?.cacheReadTokens !== undefined
          ? { cacheReadTokens: outcome.usage.cacheReadTokens }
          : prev?.cacheReadTokens !== undefined
            ? { cacheReadTokens: prev.cacheReadTokens }
            : {}),
        ...(outcome.usage?.cacheWriteTokens !== undefined
          ? { cacheWriteTokens: outcome.usage.cacheWriteTokens }
          : prev?.cacheWriteTokens !== undefined
            ? { cacheWriteTokens: prev.cacheWriteTokens }
            : {}),
        ...(outcome.usage?.reasoningTokens !== undefined
          ? { reasoningTokens: outcome.usage.reasoningTokens }
          : prev?.reasoningTokens !== undefined
            ? { reasoningTokens: prev.reasoningTokens }
            : {}),
        ...(outcome.usage?.totalTokens !== undefined
          ? { totalTokens: outcome.usage.totalTokens }
          : prev?.totalTokens !== undefined
            ? { totalTokens: prev.totalTokens }
            : {}),
        ...(outcome.costEstimate !== undefined
          ? { costUsd: outcome.costEstimate }
          : prev?.costUsd !== undefined
            ? { costUsd: prev.costUsd }
            : {}),
      }))
    }
    if (outcome.error) showError(outcome.error)
    else if (outcome.status === "idle") setTools([])
  }

  const persistCurrent = () => {
    const sid = session()?.id
    if (!sid) return
    const saved = saveChat(props.userId, props.projectId, sid, messages())
    setTabTitles((prev) => ({ ...prev, [sid]: saved.title }))
  }

  const refreshTitles = (list: AgentSession[]) => {
    const next: Record<string, string> = {}
    for (const s of list) next[s.id] = shortSessionLabel(s, props.userId, props.projectId)
    setTabTitles(next)
  }

  /**
   * Hydrate a session from the server transcript (source of truth, E1).
   * A non-empty transcript wins over the localStorage render cache; on
   * failure (offline) the cached messages already shown stay in place.
   */
  const hydrateFromServer = (projectId: string, sessionId: string) => {
    void (async () => {
      try {
        const { messages: transcript } = await api.agentTranscript(
          projectId,
          sessionId,
        )
        if (transcript.length === 0) return
        // The user may have switched tabs while we were fetching.
        if (session()?.id !== sessionId || agentStatus() === "running") return
        const hydrated: ChatMessage[] = transcript.map((m) => ({
          id: `srv-${m.id}`,
          role: m.role,
          text: m.content,
          streaming: false,
          ...(m.runId ? { runId: m.runId } : {}),
          ...(m.feedback === "up" || m.feedback === "down"
            ? { feedback: m.feedback }
            : {}),
        }))
        setMessages(hydrated)
        const saved = saveChat(props.userId, projectId, sessionId, hydrated)
        setTabTitles((prev) => ({ ...prev, [sessionId]: saved.title }))
        scrollToBottom()
      } catch {
        /* transcript unavailable — keep the local cache */
      }
    })()
  }

  const scrollToBottom = () => {
    queueMicrotask(() => {
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight
    })
  }

  const chatUi = () =>
    capabilities()?.ui ?? { showThinking: true, showToolTrace: true }

  const appendDelta = (text: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant" && last.streaming) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }]
      }
      return [
        ...prev,
        { id: nextMessageId("a"), role: "assistant", text, streaming: true },
      ]
    })
    scrollToBottom()
  }

  const appendThinkingDelta = (text: string) => {
    if (!chatUi().showThinking) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "thinking" && last.streaming) {
        return [...prev.slice(0, -1), { ...last, text: last.text + text }]
      }
      return [
        ...prev,
        {
          id: nextMessageId("th"),
          role: "thinking",
          text,
          streaming: true,
        },
      ]
    })
    scrollToBottom()
  }

  const finishThinking = (durationMs?: number) => {
    if (!chatUi().showThinking) return
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "thinking" && last.streaming) {
        return [
          ...prev.slice(0, -1),
          {
            ...last,
            streaming: false,
            meta: {
              ...last.meta,
              durationMs:
                typeof durationMs === "number" ? durationMs : last.meta?.durationMs,
            },
          },
        ]
      }
      return prev
    })
    persistCurrent()
  }

  /** Tool calls per session, folded by the one reducer of ADR 0005; the chat shows them as tool rows. */
  const toolStates = new Map<string, ToolState>()

  const applyToolEvent = (event: AgentEvent) => {
    if (!chatUi().showToolTrace) return
    const before = toolStates.get(event.sessionId) ?? createToolState()
    const after = reduceToolEvent(before, event)
    if (after === before) return
    toolStates.set(event.sessionId, after)
    const changed = changedCalls(before.calls, after.calls)
    setMessages((prev) => upsertToolRows(prev, changed, () => nextMessageId("t")))
    scrollToBottom()
  }

  const finishAssistant = () => {
    setMessages((prev) => {
      const last = prev[prev.length - 1]
      if (last?.role === "assistant" && last.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false }]
      }
      if (last?.role === "thinking" && last.streaming) {
        return [...prev.slice(0, -1), { ...last, streaming: false }]
      }
      return prev
    })
    persistCurrent()
  }

  const handleEvent = (event: AgentEvent) => {
    if (event.sessionId !== session()?.id) return
    props.onAgentEvent?.(event)
    if (event.runId) stampRunId(event.runId)
    switch (event.type) {
      case "message.delta":
        appendDelta(event.text)
        break
      case "thinking.delta":
        appendThinkingDelta(event.text)
        break
      case "thinking.completed":
        finishThinking(event.durationMs)
        break
      case "tool.started":
        setTools((t) => [...t.filter((x) => x !== event.tool), event.tool])
        applyToolEvent(event)
        if (event.todos?.length) {
          applySessionTodos(event.sessionId, event.todos)
        }
        break
      case "tool.delta":
        applyToolEvent(event)
        break
      case "tool.finished":
        setTools((t) => t.filter((x) => x !== event.tool))
        applyToolEvent(event)
        if (event.todos?.length) {
          applySessionTodos(event.sessionId, event.todos)
        }
        break
      case "usage":
        setLastUsage((prev) => ({
          tokensIn: event.tokensIn,
          tokensOut: event.tokensOut,
          ...(event.cacheReadTokens !== undefined
            ? { cacheReadTokens: event.cacheReadTokens }
            : {}),
          ...(event.cacheWriteTokens !== undefined
            ? { cacheWriteTokens: event.cacheWriteTokens }
            : {}),
          ...(event.reasoningTokens !== undefined
            ? { reasoningTokens: event.reasoningTokens }
            : {}),
          ...(event.totalTokens !== undefined
            ? { totalTokens: event.totalTokens }
            : {}),
          ...(event.costUsd !== undefined
            ? { costUsd: event.costUsd }
            : prev?.costUsd !== undefined
              ? { costUsd: prev.costUsd }
              : {}),
        }))
        break
      case "evidence.used":
        setLastEvidenceFiles(event.files)
        break
      case "session.status":
        if (event.status === "running" || event.status === "queued") {
          setAgentStatus("running")
        } else if (event.status === "error") {
          setAgentStatus("error")
          applyToolEvent(event)
          finishAssistant()
        } else {
          setAgentStatus("idle")
          applyToolEvent(event)
          finishAssistant()
          setTools([])
        }
        break
      default:
        break
    }
  }

  const feedbackMessageId = createMemo(() => {
    const status = agentStatus()
    if (status !== "idle" && status !== "error") return null
    const list = messages()
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const m = list[i]!
      // Still show the latch ("Thanks") when already rated; hide only while streaming.
      if (m.role === "assistant" && m.runId && !m.streaming) return m.id
    }
    return null
  })

  const onFeedback = async (
    messageId: string,
    runId: string,
    payload: { rating: "up" | "down"; tags?: string[]; comment?: string },
  ) => {
    await api.runFeedback(props.projectId, runId, payload)
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, feedback: payload.rating } : m,
      ),
    )
    persistCurrent()
  }

  const waitUntilVisible = (signal: AbortSignal): Promise<void> => {
    if (typeof document === "undefined") return Promise.resolve()
    if (document.visibilityState === "visible") return Promise.resolve()
    return new Promise((resolve) => {
      const done = () => {
        document.removeEventListener("visibilitychange", onVis)
        signal.removeEventListener("abort", onAbort)
        resolve()
      }
      const onVis = () => {
        if (document.visibilityState === "visible") done()
      }
      const onAbort = () => done()
      document.addEventListener("visibilitychange", onVis)
      signal.addEventListener("abort", onAbort, { once: true })
    })
  }

  const connectEvents = (projectId: string, sessionId: string) => {
    eventsAbort?.abort()
    if (caughtUpTimer) clearTimeout(caughtUpTimer)
    const ac = new AbortController()
    eventsAbort = ac
    eventsReady = new Promise<void>((resolve) => {
      eventsReadyResolve = resolve
    })

    void (async () => {
      let attempt = 0
      const maxTransient = 12
      while (!ac.signal.aborted) {
        try {
          await waitUntilVisible(ac.signal)
          if (ac.signal.aborted) return
          const body = await api.openAgentEvents(projectId, sessionId, ac.signal)
          eventsReadyResolve?.()
          eventsReadyResolve = undefined
          if (attempt > 0) {
            setBanner(streamCaughtUpBanner())
            if (caughtUpTimer) clearTimeout(caughtUpTimer)
            caughtUpTimer = setTimeout(() => {
              setBanner((prev) =>
                prev?.message.startsWith("Event stream: reconnected")
                  ? null
                  : prev,
              )
            }, 2500)
          } else {
            setBanner((prev) =>
              prev?.message.startsWith("Event stream:") ? null : prev,
            )
          }
          attempt = 0
          for await (const event of readAgentEventStream(body, ac.signal)) {
            if (ac.signal.aborted) break
            handleEvent(event)
          }
          if (ac.signal.aborted) return
        } catch (cause) {
          if (ac.signal.aborted) return
          if (attempt === 0) {
            eventsReadyResolve?.()
            eventsReadyResolve = undefined
          }
          if (isTerminalSseError(cause)) {
            showError(cause)
            return
          }
          if (cause instanceof ApiError && cause.status === 502) {
            showError(cause)
            return
          }
          if (attempt >= maxTransient) {
            setBanner({
              message: "Event stream: reconnect failed",
              tone: "danger",
            })
            return
          }
          setBanner(
            streamReconnectBanner(
              cause instanceof Error ? cause.message : "failed",
            ),
          )
        }
        if (ac.signal.aborted) return
        await waitUntilVisible(ac.signal)
        if (ac.signal.aborted) return
        const delay = Math.min(1000 * 2 ** attempt, 8000)
        attempt += 1
        await new Promise((r) => setTimeout(r, delay))
      }
    })()
  }

  const activateSession = (next: AgentSession) => {
    persistCurrent()
    setSession(next)
    setActiveSessionId(props.userId, props.projectId, next.id)
    const cached = loadChat(props.userId, props.projectId, next.id)
    setMessages(cached.messages)
    setTabTitles((prev) => ({
      ...prev,
      [next.id]: cached.title || shortSessionLabel(next, props.userId, props.projectId),
    }))
    setAgentStatus(
      next.status === "running" || next.status === "queued" ? "running" : "idle",
    )
    setTools([])
    setLastUsage(null)
    loadTodosForSession(next.id)
    clearBanner()
    // Keep per-session drafts; composer reads draft for `next.id`.
    void connectEvents(props.projectId, next.id)
    hydrateFromServer(props.projectId, next.id)
    scrollToBottom()
  }

  createEffect(() => {
    const projectId = props.projectId
    setBootstrapping(true)
    clearBanner()
    setMessages([])
    setSession(null)
    setSessions([])
    setCapabilities(null)
    setTools([])
    setLastUsage(null)
    setSessionTodos([])
    setTodosHidden(false)
    setTodosCollapsed(false)
    setAgentStatus("idle")
    setDraftBySession({})
    setTabTitles({})
    eventsAbort?.abort()

    let cancelled = false
    void (async () => {
      try {
        const caps = await api.agentCapabilities(projectId)
        if (cancelled) return
        setCapabilities(caps)
        const savedModel = loadModelId(props.userId)
        const preferred =
          (savedModel
            ? caps.models.find((m) => m.id === savedModel)
            : undefined)
          ?? caps.models.find((m) => m.id === "cursor/auto")
          ?? caps.models[0]
        setModelId(preferred?.id ?? "")
        if (preferred?.id) saveModelId(props.userId, preferred.id)

        const listed = await api.agentSessions(projectId)
        if (cancelled) return
        const runtimeListed = listed.sessions.filter(
          (s) => s.runtime === caps.runtime,
        )
        const preferredId = getActiveSessionId(props.userId, projectId)
        let runtimeSessions = await selectVisibleSessions(
          props.userId,
          projectId,
          runtimeListed,
          preferredId,
        )
        if (cancelled) return
        runtimeSessions = await ensureRuntimeSession(projectId, runtimeSessions)
        if (cancelled) return

        setSessions(runtimeSessions)
        refreshTitles(runtimeSessions)

        const current =
          runtimeSessions.find((s) => s.id === preferredId)
          ?? runtimeSessions.find((s) =>
            hasChatHistory(props.userId, projectId, s.id),
          )
          ?? runtimeSessions[0]!
        setSession(current)
        setActiveSessionId(props.userId, projectId, current.id)
        const cached = loadChat(props.userId, projectId, current.id)
        setMessages(cached.messages)
        setTabTitles((prev) => ({
          ...prev,
          [current.id]:
            cached.title || shortSessionLabel(current, props.userId, projectId),
        }))
        setBootstrapping(false)
        void connectEvents(projectId, current.id)
        hydrateFromServer(projectId, current.id)
        scrollToBottom()
      } catch (cause) {
        if (!cancelled) {
          showError(cause)
          setBootstrapping(false)
        }
      }
    })()

    onCleanup(() => {
      cancelled = true
      eventsAbort?.abort()
      if (caughtUpTimer) clearTimeout(caughtUpTimer)
      const sid = session()?.id
      if (sid) saveChat(props.userId, projectId, sid, messages())
    })
  })

  const newChat = async () => {
    if (bootstrapping() || agentStatus() === "running") return
    clearBanner()
    try {
      persistCurrent()
      const created = await api.createAgentSession(props.projectId)
      const next = created.session
      setSessions((prev) => [next, ...prev.filter((s) => s.id !== next.id)])
      setTabTitles((prev) => ({ ...prev, [next.id]: EMPTY_AGENT_TITLE }))
      setSession(next)
      setActiveSessionId(props.userId, props.projectId, next.id)
      setMessages([])
      setDraftBySession((prev) => ({ ...prev, [next.id]: "" }))
      setAgentStatus("idle")
      setTools([])
      setLastUsage(null)
      void connectEvents(props.projectId, next.id)
    } catch (cause) {
      showError(cause)
    }
  }

  const closeTab = (sessionId: string, event: MouseEvent) => {
    event.stopPropagation()
    event.preventDefault()
    if (agentStatus() === "running" && session()?.id === sessionId) return
    const list = sessions()
    if (list.length <= 1) return

    removeChatCache(props.userId, props.projectId, sessionId)
    clearDraftFor(sessionId)
    clearAttachmentFor(sessionId)
    const remaining = list.filter((s) => s.id !== sessionId)
    setSessions(remaining)
    setTabTitles((prev) => {
      const next = { ...prev }
      delete next[sessionId]
      return next
    })

    if (session()?.id === sessionId) {
      const fallback = remaining[0]!
      setSession(fallback)
      setActiveSessionId(props.userId, props.projectId, fallback.id)
      const cached = loadChat(props.userId, props.projectId, fallback.id)
      setMessages(cached.messages)
      setAgentStatus("idle")
      setTools([])
      setLastUsage(null)
      void connectEvents(props.projectId, fallback.id)
      hydrateFromServer(props.projectId, fallback.id)
    }

    void api.deleteAgentSession(props.projectId, sessionId).catch(() => {
      /* UI already dropped the tab */
    })
  }

  let sendInFlight = false
  const send = async () => {
    const text = draft().trim()
    const sid = session()?.id
    const model = modelId()
    const shot = pendingAttachment()
    if (!text || !sid || !model || agentStatus() === "running" || sendInFlight) {
      return
    }
    sendInFlight = true

    clearBanner()
    setDraft("")
    const clientMsgId = nextMessageId("u")
    const attachmentName = shot?.name
    // Detach before the request so the chip clears even if send fails mid-flight.
    const images = shot
      ? [{ mediaType: shot.mediaType, data: shot.data }]
      : undefined
    clearAttachmentFor(sid)
    setMessages((prev) => {
      const next = [
        ...prev,
        {
          id: clientMsgId,
          role: "user" as const,
          text,
          ...(attachmentName ? { attachmentName } : {}),
        },
      ]
      const saved = saveChat(props.userId, props.projectId, sid, next)
      setTabTitles((titles) => ({ ...titles, [sid]: saved.title }))
      return next
    })
    setAgentStatus("running")
    scrollToBottom()

    try {
      await Promise.race([
        eventsReady,
        new Promise<void>((r) => setTimeout(r, 2000)),
      ])
      const params =
        model === GROK_ID
          ? grokModelParams(grok())
          : model === OPUS_ID
            ? opusModelParams(opus())
            : undefined
      const outcome = await api.promptAgent(
        props.projectId,
        sid,
        text,
        model,
        params,
        clientMsgId,
        images,
      )
      if (outcome) applyPromptOutcome(outcome)
    } catch (cause) {
      showError(cause)
      setAgentStatus("error")
      finishAssistant()
    } finally {
      sendInFlight = false
    }
  }

  const abort = async () => {
    const sid = session()?.id
    if (!sid) return
    try {
      await api.abortAgent(props.projectId, sid)
      setAgentStatus("idle")
      finishAssistant()
      setTools([])
    } catch (cause) {
      showError(cause)
    }
  }

  const markImported = (sessionId: string) => {
    setImportedIds((prev) => {
      const next = new Set(prev)
      next.add(sessionId)
      return next
    })
  }

  const exportChat = async () => {
    const sid = session()?.id
    if (!sid) return
    try {
      let bundle = await api.exportAgentSession(props.projectId, sid)
      const extras: {
        trace?: ReturnType<typeof traceFromUiMessages>
        todos?: AgentTodoItem[]
      } = {}
      if (readExportIncludeTrace()) {
        extras.trace = traceFromUiMessages(messages())
      }
      const todos = sessionTodos()
      if (todos.length > 0) extras.todos = todos
      if (extras.trace || extras.todos) {
        bundle = await withExportExtras(bundle, extras)
      }
      const blob = new Blob([`${JSON.stringify(bundle, null, 2)}\n`], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `chat-${sid.slice(0, 8)}.buildychat.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (cause) {
      showError(cause)
    }
  }

  const exportBrief = async () => {
    try {
      const brief = await api.exportProjectBrief(props.projectId)
      const id =
        typeof (brief as { identity?: { id?: string } }).identity?.id === "string"
          ? (brief as { identity: { id: string } }).identity.id
          : props.projectId.slice(0, 8)
      const blob = new Blob([`${JSON.stringify(brief, null, 2)}\n`], {
        type: "application/json",
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${id}.buildybrief.json`
      a.click()
      URL.revokeObjectURL(url)
      clearBanner()
      setBanner({
        message: "Product brief SPEC exported",
        tone: "warn",
      })
    } catch (cause) {
      showError(cause)
    }
  }

  const importBriefBundle = async (raw: unknown) => {
    try {
      const result = await api.importProjectBrief(props.projectId, raw)
      setDraft(BRIEF_REBUILD_STARTER)
      clearBanner()
      setBanner({
        message:
          `Brief ${result.identity.id} saved to ${result.path} — send the `
          + "composer prompt to rebuild 1:1 from the SPEC.",
        tone: "warn",
      })
    } catch (cause) {
      showError(cause)
    }
  }

  const importBriefFromFile = async (file: File) => {
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      await importBriefBundle(raw)
    } catch (cause) {
      if (cause instanceof SyntaxError) {
        showError(new ApiError(400, "Invalid brief file (not JSON)"))
        return
      }
      showError(cause)
    }
  }

  const attachScreenshot = async (file: File) => {
    const sid = session()?.id
    if (!sid) return
    const mediaType = (file.type || "").toLowerCase()
    const allowed = new Set([
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/gif",
    ])
    if (!allowed.has(mediaType)) {
      showError(new ApiError(400, "Use png, jpeg, webp, or gif"))
      return
    }
    const maxBytes = 4 * 1024 * 1024
    if (file.size <= 0 || file.size > maxBytes) {
      showError(new ApiError(400, `Screenshot must be 1…${maxBytes} bytes`))
      return
    }
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ""
      const chunk = 0x8000
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
      }
      const data = btoa(binary)
      const previewUrl = URL.createObjectURL(file)
      clearAttachmentFor(sid)
      setAttachmentBySession((prev) => ({
        ...prev,
        [sid]: {
          name: file.name || "screenshot.png",
          previewUrl,
          mediaType,
          data,
        },
      }))
      // Hypothesis prompt — image is the source of truth, not .buildy/brief.json.
      setDraft(SCREENSHOT_ATTACH_STARTER)
      clearBanner()
    } catch (cause) {
      showError(cause)
    }
  }

  const copyRequestId = async () => {
    const sid = session()?.id
    if (!sid) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(sid)
      } else {
        const ta = document.createElement("textarea")
        ta.value = sid
        ta.setAttribute("readonly", "")
        ta.style.position = "fixed"
        ta.style.left = "-9999px"
        document.body.appendChild(ta)
        ta.select()
        document.execCommand("copy")
        document.body.removeChild(ta)
      }
      clearBanner()
      setBanner({ message: "Request ID copied", tone: "warn" })
    } catch (cause) {
      showError(cause)
    }
  }

  const importBundle = async (raw: unknown) => {
    try {
      const replaceId = session()?.id
      const replaceEmpty = shouldReplaceEmptySession({
        sessionId: replaceId,
        messageCount: messages().length,
        agentRunning: agentStatus() === "running",
      })

      const result = await api.importAgentSession(props.projectId, raw)
      const next = result.session
      markImported(next.id)

      setSessions((prev) => {
        let list = [next, ...prev.filter((s) => s.id !== next.id)]
        if (replaceEmpty && replaceId && replaceId !== next.id) {
          list = list.filter((s) => s.id !== replaceId)
        }
        return list
      })
      setTabTitles((prev) => {
        const titles = {
          ...prev,
          [next.id]: next.title?.trim() || "Imported chat",
        }
        if (replaceEmpty && replaceId && replaceId !== next.id) {
          delete titles[replaceId]
        }
        return titles
      })

      if (replaceEmpty && replaceId && replaceId !== next.id) {
        removeChatCache(props.userId, props.projectId, replaceId)
        clearDraftFor(replaceId)
        void api.deleteAgentSession(props.projectId, replaceId).catch(() => {
          /* empty tab already dropped from UI */
        })
      }

      activateSession(next)
      clearBanner()
      setBanner({
        message: `Imported ${result.messageCount} messages — next prompt starts a fresh agent with this history.`,
        tone: "warn",
      })
    } catch (cause) {
      showError(cause)
    }
  }

  const importFromFile = async (file: File) => {
    try {
      const text = await file.text()
      const raw: unknown = JSON.parse(text)
      await importBundle(raw)
    } catch (cause) {
      if (cause instanceof SyntaxError) {
        showError(new ApiError(400, "Invalid chat file (not JSON)"))
        return
      }
      showError(cause)
    }
  }

  const onDragEnter = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes("Files")) return
    event.preventDefault()
    dropDepth += 1
    setDropActive(true)
  }
  const onDragLeave = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes("Files")) return
    event.preventDefault()
    dropDepth = Math.max(0, dropDepth - 1)
    if (dropDepth === 0) setDropActive(false)
  }
  const onDragOver = (event: DragEvent) => {
    if (!event.dataTransfer?.types.includes("Files")) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }
  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    dropDepth = 0
    setDropActive(false)
    if (agentStatus() === "running" || bootstrapping()) return
    const file = event.dataTransfer?.files?.[0]
    if (!file) return
    void importFromFile(file)
  }

  return (
    <Box
      class="chat"
      classList={{ "chat-drop-active": dropActive() }}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Input
        ref={(el) => {
          importInput = el
        }}
        type="file"
        accept=".json,.buildychat.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ""
          if (file) void importFromFile(file)
        }}
      />
      <Input
        ref={(el) => {
          briefImportInput = el
        }}
        type="file"
        accept=".json,.buildybrief.json,application/json"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ""
          if (file) void importBriefFromFile(file)
        }}
      />
      <Input
        ref={(el) => {
          visionImportInput = el
        }}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,.png,.jpg,.jpeg,.webp,.gif"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ""
          if (file) void attachScreenshot(file)
        }}
      />
      <ChatTabs
        sessions={sessions()}
        activeId={activeId()}
        titles={tabTitles()}
        importedIds={importedIds()}
        disabled={bootstrapping()}
        switchLocked={agentStatus() === "running"}
        onCollapse={props.onCollapse}
        onSelect={activateSession}
        onClose={closeTab}
        onNew={() => void newChat()}
        onExport={() => void exportChat()}
        onImportPick={() => importInput?.click()}
        onExportBrief={() => void exportBrief()}
        onImportBriefPick={() => briefImportInput?.click()}
        onRecognizeScreenshot={() => visionImportInput?.click()}
        onCopyRequestId={() => void copyRequestId()}
      />

      <ChatToolbar
        runtime={capabilities()?.runtime}
        runtimeLabel={capabilities()?.runtimeLabel}
        status={agentStatus()}
        tools={tools()}
        models={capabilities()?.models ?? []}
        modelId={modelId()}
        grok={grok()}
        opus={opus()}
        usage={lastUsage()}
        evidenceFiles={lastEvidenceFiles()}
        onModelChange={(id) => {
          setModelId(id)
          saveModelId(props.userId, id)
        }}
        onGrokChange={(next) => {
          setGrok(next)
          saveGrokOptions(props.userId, next)
        }}
        onOpusChange={(next) => {
          setOpus(next)
          saveOpusOptions(props.userId, next)
        }}
      />

      <Show when={banner()}>
        {(b) => (
          <ChatBanner
            message={b().message}
            tone={b().tone}
            settingsHref={b().settingsHref}
            onDismiss={clearBanner}
          />
        )}
      </Show>

      <Show when={!todosHidden() && sessionTodos().length > 0}>
        <ChatTodosPanel
          todos={sessionTodos()}
          collapsed={todosCollapsed()}
          onToggle={() => setTodosCollapsed((v) => !v)}
          onDismiss={() => setTodosHidden(true)}
        />
      </Show>

      <ChatMessageList
        bootstrapping={bootstrapping()}
        messages={messages()}
        scrollRef={(el) => {
          scrollEl = el
        }}
        onStarter={(text) => setDraft(text)}
        onImportBrief={() => briefImportInput?.click()}
        onRecognizeScreenshot={() => visionImportInput?.click()}
        recognizeBusy={false}
        feedbackMessageId={feedbackMessageId()}
        onFeedback={onFeedback}
      />

      <ChatComposer
        draft={draft()}
        disabled={bootstrapping() || !session()}
        running={agentStatus() === "running"}
        attachment={(() => {
          const shot = pendingAttachment()
          return shot
            ? { name: shot.name, previewUrl: shot.previewUrl }
            : null
        })()}
        onClearAttachment={clearPendingAttachment}
        canSend={
          !bootstrapping()
          && Boolean(session())
          && Boolean(draft().trim())
          && Boolean(modelId())
          && agentStatus() !== "running"
        }
        onDraftChange={setDraft}
        onSend={() => void send()}
        onAbort={() => void abort()}
      />
    </Box>
  )
}
