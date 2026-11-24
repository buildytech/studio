import {
  For,
  Show,
  createEffect,
  createResource,
  createSignal,
  onCleanup,
  type JSX,
} from "solid-js"
import { A, useParams } from "@solidjs/router"
import {
  api,
  statusLabel,
  type CursorAccount,
  type Project,
  type User,
} from "./api"
import { Chat } from "./Chat"
import { hostNotices } from "./host-capabilities"
import {
  persistSidePct,
  readSidePct,
  sidePctFromPointer,
  clampSidePct,
  MAX_SIDE_PCT,
  MIN_SIDE_PCT,
} from "./studio-split"
import { BUILTIN_STUDIO_PANELS } from "./studio/panels/builtins"
import { PanelHost } from "./studio/panels/PanelHost"
import {
  persistActivePanelId,
  readActivePanelId,
  readLastPanelId,
} from "./studio/panels/persistence"
import { BUILTIN_STUDIO_PANEL_PROVIDERS } from "./studio/panels/providers"
import {
  defaultStudioPanelId,
  resolveStudioPanels,
} from "./studio/panels/registry"

const CHAT_OPEN_KEY = "buildy.chatOpen"
const STUDIO_PANELS = resolveStudioPanels(
  BUILTIN_STUDIO_PANELS,
  BUILTIN_STUDIO_PANEL_PROVIDERS,
)
const STUDIO_PANEL_IDS = STUDIO_PANELS.map((panel) => panel.schema.id)
const DEFAULT_STUDIO_PANEL_ID = defaultStudioPanelId(STUDIO_PANELS)

function readChatOpen(): boolean {
  try {
    const v = localStorage.getItem(CHAT_OPEN_KEY)
    if (v === null) return true
    return v === "1" || v === "true"
  } catch {
    return true
  }
}

function persistChatOpen(open: boolean): void {
  try {
    localStorage.setItem(CHAT_OPEN_KEY, open ? "1" : "0")
  } catch {
    /* ignore */
  }
}

export function Studio(props: { user: User }): JSX.Element {
  const params = useParams<{ id: string }>()
  const initialPanelId = readActivePanelId(
    STUDIO_PANEL_IDS,
    DEFAULT_STUDIO_PANEL_ID,
  )
  const [project, setProject] = createSignal<Project | null>(null)
  const [status, setStatus] = createSignal("idle")
  const [error, setError] = createSignal("")
  const [hostCaps] = createResource(async () => {
    try {
      return await api.hostCapabilities()
    } catch {
      return null
    }
  })
  const [activePanelId, setActivePanelId] = createSignal<string | null>(
    initialPanelId,
  )
  const [lastPanelId, setLastPanelId] = createSignal(
    readLastPanelId(
      STUDIO_PANEL_IDS,
      initialPanelId ?? DEFAULT_STUDIO_PANEL_ID,
    ),
  )
  const [chatOpen, setChatOpen] = createSignal(readChatOpen())
  const [sidePct, setSidePct] = createSignal(readSidePct())
  const [splitting, setSplitting] = createSignal(false)
  const [cursorAccount, setCursorAccount] = createSignal<CursorAccount | null>(
    null,
  )
  const [accountMenuOpen, setAccountMenuOpen] = createSignal(false)

  const projectId = () => params.id

  createEffect(() => {
    let cancelled = false
    void api
      .cursorAccount()
      .then((res) => {
        if (!cancelled) setCursorAccount(res.account)
      })
      .catch(() => {
        if (!cancelled) setCursorAccount(null)
      })
    onCleanup(() => {
      cancelled = true
    })
  })

  createEffect(() => {
    if (!accountMenuOpen()) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null
      if (t?.closest?.(".studio-account")) return
      setAccountMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAccountMenuOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    onCleanup(() => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    })
  })

  const sideOpen = () => activePanelId() !== null

  let panesEl: HTMLDivElement | undefined

  const startSplitDrag = (event: PointerEvent) => {
    if (!sideOpen() || !chatOpen() || !panesEl) return
    event.preventDefault()
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
    setSplitting(true)
    let latest = sidePct()

    const onMove = (ev: PointerEvent) => {
      if (!panesEl) return
      latest = sidePctFromPointer(ev.clientX, panesEl.getBoundingClientRect())
      setSidePct(latest)
    }
    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId)
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onUp)
      handle.removeEventListener("pointercancel", onUp)
      setSplitting(false)
      persistSidePct(latest)
    }
    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  const setPanel = (panelId: string | null) => {
    setActivePanelId(panelId)
    persistActivePanelId(panelId)
    if (panelId) setLastPanelId(panelId)
  }

  const setChatVisible = (open: boolean) => {
    setChatOpen(open)
    persistChatOpen(open)
  }

  /** Hide chat so the active editor surface can use the full Studio width. */
  const toggleChat = () => {
    if (chatOpen()) {
      if (!sideOpen()) setPanel(lastPanelId() || DEFAULT_STUDIO_PANEL_ID)
      setChatVisible(false)
      return
    }
    setChatVisible(true)
  }

  const togglePanel = (panelId: string) => {
    if (activePanelId() === panelId) {
      if (!chatOpen()) setChatVisible(true)
      setPanel(null)
      return
    }
    setPanel(panelId)
  }

  const accountLabel = () =>
    cursorAccount()?.displayName
    ?? props.user.displayName
    ?? props.user.email
    ?? "Account"

  const collapseSide = () => {
    if (!chatOpen()) setChatVisible(true)
    setPanel(null)
  }

  createEffect(() => {
    const id = projectId()
    setProject(null)
    setStatus("idle")
    setError("")

    let cancelled = false
    void (async () => {
      try {
        const res = await api.listProjects()
        if (cancelled) return
        const p = res.projects.find((x) => x.id === id) ?? null
        setProject(p)
        if (!p) setError("Project not found")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()

    onCleanup(() => {
      cancelled = true
    })
  })

  return (
    <div class="studio">
      <header class="studio-bar">
        <div class="studio-bar-left">
          <A href="/" class="brand compact">
            Buildy
          </A>
          <span class="bar-sep" aria-hidden="true" />
          <Show when={project()} fallback={<span class="muted">Loading…</span>}>
            {(p) => <h1 class="studio-title">{p().name}</h1>}
          </Show>
          <span class={`status-pill status-${status()}`}>{statusLabel(status())}</span>
        </div>
        <div class="studio-bar-right">
          <button
            type="button"
            class="btn ghost"
            disabled
            title="Coming soon"
          >
            Remix
          </button>
          <button
            type="button"
            class="btn ghost"
            disabled
            title="Coming soon"
          >
            Publish
          </button>

          <div class="studio-account">
            <button
              type="button"
              class="studio-account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen()}
              title={
                cursorAccount()?.email
                  ? `Cursor · ${cursorAccount()!.email}`
                  : "Account"
              }
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <span class="studio-cursor-user">{accountLabel()}</span>
              <span class="studio-account-caret" aria-hidden="true">
                ▾
              </span>
            </button>
            <Show when={accountMenuOpen()}>
              <div class="studio-account-menu" role="menu">
                <A
                  class="studio-account-item"
                  href="/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  Settings
                </A>
              </div>
            </Show>
          </div>
        </div>
      </header>

      <Show when={error()}>
        <div class="studio-banner">{error()}</div>
      </Show>
      <Show when={!hostCaps.loading}>
        <For each={hostNotices(hostCaps())}>
          {(note) => <div class="studio-banner">{note}</div>}
        </For>
      </Show>

      <div
        class="studio-panes"
        classList={{
          "side-collapsed": !sideOpen(),
          "preview-collapsed": !sideOpen(),
          "chat-collapsed": !chatOpen(),
          "is-splitting": splitting(),
        }}
        style={{ "--studio-side-width": `${sidePct()}%` }}
        ref={(el) => {
          panesEl = el
        }}
      >
        <section
          class="studio-pane agent-pane"
          aria-hidden={!chatOpen()}
        >
          <Show
            when={projectId()}
            fallback={<div class="pane-empty">Select a project</div>}
          >
            {(id) => (
              <Chat
                userId={props.user.id}
                projectId={id()}
                onCollapse={toggleChat}
              />
            )}
          </Show>
        </section>
        <Show when={sideOpen() && chatOpen()}>
          <div
            class="studio-split"
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat and side panel"
            aria-valuemin={MIN_SIDE_PCT}
            aria-valuemax={MAX_SIDE_PCT}
            aria-valuenow={Math.round(sidePct())}
            tabindex={0}
            onPointerDown={(e) => startSplitDrag(e)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
              e.preventDefault()
              const delta = e.key === "ArrowLeft" ? 2 : -2
              const next = clampSidePct(sidePct() + delta)
              setSidePct(next)
              persistSidePct(next)
            }}
          />
        </Show>
        <section
          id="studio-side-sheet"
          class="studio-pane side-sheet"
          aria-hidden={!sideOpen()}
        >
          <div class="side-toolbar">
            <div class="studio-segment" role="group" aria-label="Side panel">
              <For each={STUDIO_PANELS}>
                {(panel) => {
                  const active = () => activePanelId() === panel.schema.id
                  return (
                    <button
                      type="button"
                      class="studio-segment-btn"
                      classList={{ active: active() }}
                      aria-pressed={active()}
                      title={`${active() ? "Hide" : "Show"} ${panel.schema.label.toLowerCase()}`}
                      onClick={() => togglePanel(panel.schema.id)}
                    >
                      {panel.schema.label}
                    </button>
                  )
                }}
              </For>
            </div>
            <span />
            <button
              type="button"
              class="sheet-collapse"
              aria-label="Collapse side panel"
              onClick={collapseSide}
            >
              ›
            </button>
          </div>

          <PanelHost
            panels={STUDIO_PANELS}
            activePanelId={activePanelId()}
            projectId={projectId()}
            project={project()}
            onActivate={setPanel}
            onError={setError}
            onProjectChange={setProject}
            onStatusChange={setStatus}
          />
        </section>
        <Show when={!sideOpen()}>
          <button
            type="button"
            class="preview-rail"
            aria-label={`Show ${lastPanelId() || DEFAULT_STUDIO_PANEL_ID} panel`}
            onClick={() => setPanel(lastPanelId() || DEFAULT_STUDIO_PANEL_ID)}
          >
            {STUDIO_PANELS.find((panel) => panel.schema.id === lastPanelId())
              ?.schema.label ?? "Panel"}
          </button>
        </Show>
        <Show when={!chatOpen()}>
          <button
            type="button"
            class="chat-rail"
            aria-label="Show chat"
            onClick={toggleChat}
          >
            Chat
          </button>
        </Show>
      </div>
    </div>
  )
}
