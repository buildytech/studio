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
import { countTreeFiles } from "./editor/tree-count"
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
import { Box, Button, Text } from "./primitives"
import { cssVars } from "./lib/css-vars"
import { AppIcon } from "./app-icons"
import { t, type MessageKey } from "./i18n"
import { ThemeIcon, type ThemeIconName } from "./app-icons/theme-icons"
import { setThemePref, themePref, type ThemePref } from "./theme/prefs"
import "./theme/account-menu.css"

const CHAT_OPEN_KEY = "buildy.chatOpen"

/** The account menu's quick theme switch (ADR 0007); Settings → Appearance has the same choice and the skins. */
const THEME_ITEMS: { id: ThemePref; label: MessageKey; icon: ThemeIconName }[] = [
  { id: "light", label: "theme.light", icon: "sun" },
  { id: "dark", label: "theme.dark", icon: "moon" },
  { id: "system", label: "theme.system", icon: "monitor" },
]
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
  const [hostCaps, { refetch: retryHostCaps }] = createResource(async () => {
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

  let panesEl: HTMLElement | undefined

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

  /**
   * An empty project (the Empty template, before a ZIP) has nothing to preview: open the Editor, whose empty tree
   * offers Import ZIP, instead of a preview that can only fail. Not persisted: other projects keep the last panel.
   */
  const openEditorWhenEmpty = async (id: string, cancelled: () => boolean) => {
    try {
      const res = await api.listProjectFiles(id)
      if (cancelled() || countTreeFiles(res.tree) > 0) return
      setActivePanelId("code")
      setLastPanelId("code")
    } catch {
      /* the panels show their own errors */
    }
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
        else void openEditorWhenEmpty(id, () => cancelled)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()

    onCleanup(() => {
      cancelled = true
    })
  })

  return (
    <Box class="studio">
      <Box tag="header" class="studio-bar">
        <Box class="studio-bar-left">
          <A href="/" class="brand compact">
            {t("brand.name")}
          </A>
          <Text tag="span" class="bar-sep" aria-hidden="true" />
          <Show when={project()} fallback={<Text tag="span" class="muted">{t("common.loading")}</Text>}>
            {(p) => <Text tag="h1" class="studio-title">{p().name}</Text>}
          </Show>
          <Text tag="span" class={`status-pill status-${status()}`}>{statusLabel(status())}</Text>
        </Box>
        <Box class="studio-bar-right">
          <Box class="studio-account">
            <Button
              type="button"
              class="studio-account-trigger"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen()}
              title={
                cursorAccount()?.email
                  ? t("studio.accountCursor", { email: cursorAccount()!.email ?? "" })
                  : t("studio.account")
              }
              onClick={() => setAccountMenuOpen((open) => !open)}
            >
              <Text tag="span" class="studio-cursor-user">{accountLabel()}</Text>
              <AppIcon name="chevron-down" size={12} class="studio-account-caret" />
            </Button>
            <Show when={accountMenuOpen()}>
              <Box class="studio-account-menu" role="menu" aria-label={t("studio.account")}>
                <A
                  class="studio-account-item"
                  href="/settings"
                  role="menuitem"
                  onClick={() => setAccountMenuOpen(false)}
                >
                  {t("nav.settings")}
                </A>
                <Box role="group" aria-labelledby="studio-theme-label">
                  <Text tag="span" id="studio-theme-label" class="studio-account-heading">{t("theme.label")}</Text>
                  <For each={THEME_ITEMS}>
                    {(item) => (
                      <Button
                        type="button"
                        class="studio-account-item studio-account-radio"
                        role="menuitemradio"
                        aria-checked={themePref() === item.id}
                        onClick={() => setThemePref(item.id)}
                      >
                        <ThemeIcon name={item.icon} size={14} />
                        <Text tag="span">{t(item.label)}</Text>
                      </Button>
                    )}
                  </For>
                </Box>
              </Box>
            </Show>
          </Box>
        </Box>
      </Box>

      <Show when={error()}>
        <Box class="studio-banner">{error()}</Box>
      </Show>
      <Show when={!hostCaps.loading}>
        <For each={hostNotices(hostCaps())}>
          {(note) => <Box class="studio-banner">{note}</Box>}
        </For>
        <Show when={!hostCaps()}>
          <Box class="studio-banner">
            <Button type="button" class="btn ghost" onClick={() => void retryHostCaps()}>
              {t("common.retry")}
            </Button>
          </Box>
        </Show>
      </Show>

      <Box
        class="studio-panes"
        classList={{
          "side-collapsed": !sideOpen(),
          "preview-collapsed": !sideOpen(),
          "chat-collapsed": !chatOpen(),
          "is-splitting": splitting(),
        }}
        ref={(el) => {
          panesEl = el
          cssVars(el, () => ({ "--studio-side-width": `${sidePct()}%` }))
        }}
      >
        <Box tag="section"
          class="studio-pane agent-pane"
          aria-hidden={!chatOpen()}
        >
          <Show
            when={projectId()}
            fallback={<Box class="pane-empty">{t("studio.selectAProject")}</Box>}
          >
            {(id) => (
              <Chat
                userId={props.user.id}
                projectId={id()}
                onCollapse={toggleChat}
              />
            )}
          </Show>
        </Box>
        <Show when={sideOpen() && chatOpen()}>
          <Box
            class="studio-split"
            role="separator"
            aria-orientation="vertical"
            aria-label={t("studio.resizeChatAndSide")}
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
        <Box tag="section"
          id="studio-side-sheet"
          class="studio-pane side-sheet"
          aria-hidden={!sideOpen()}
        >
          <Box class="side-toolbar">
            <Box class="studio-segment" role="group" aria-label={t("studio.sidePanel")}>
              <For each={STUDIO_PANELS}>
                {(panel) => {
                  const active = () => activePanelId() === panel.schema.id
                  return (
                    <Button
                      type="button"
                      class="studio-segment-btn"
                      classList={{ active: active() }}
                      aria-pressed={active()}
                      title={`${active() ? "Hide" : "Show"} ${panel.schema.label.toLowerCase()}`}
                      onClick={() => togglePanel(panel.schema.id)}
                    >
                      {panel.schema.label}
                    </Button>
                  )
                }}
              </For>
            </Box>
            <Text tag="span" />
            <Button
              type="button"
              class="sheet-collapse"
              aria-label={t("studio.collapseSidePanel")}
              onClick={collapseSide}
            >
              <AppIcon name="chevron-right" size={14} />
            </Button>
          </Box>

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
        </Box>
        <Show when={!sideOpen()}>
          <Button
            type="button"
            class="preview-rail"
            aria-label={`Show ${lastPanelId() || DEFAULT_STUDIO_PANEL_ID} panel`}
            onClick={() => setPanel(lastPanelId() || DEFAULT_STUDIO_PANEL_ID)}
          >
            {STUDIO_PANELS.find((panel) => panel.schema.id === lastPanelId())
              ?.schema.label ?? t("studio.panel")}
          </Button>
        </Show>
        <Show when={!chatOpen()}>
          <Button
            type="button"
            class="chat-rail"
            aria-label={t("studio.showChat")}
            onClick={toggleChat}
          >
            {t("studio.chat")}
          </Button>
        </Show>
      </Box>
    </Box>
  )
}
