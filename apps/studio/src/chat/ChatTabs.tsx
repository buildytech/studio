import { For, Show, createEffect, createSignal, onCleanup, type JSX } from "solid-js"
import type { AgentSession } from "../api"
import {
  ensureExportIncludeTraceDefault,
  readExportIncludeTrace,
} from "../chat-export-prefs"
import { Box, Button, Text } from "../primitives"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"

export type ChatTabsProps = {
  sessions: AgentSession[]
  activeId: string
  titles: Record<string, string>
  /** Session ids that were created via portable import (badge). */
  importedIds?: ReadonlySet<string>
  disabled?: boolean
  switchLocked?: boolean
  /** Collapse chat so the side pane (Editor/Preview) can go full width. */
  onCollapse?: () => void
  onSelect: (session: AgentSession) => void
  onClose: (sessionId: string, event: MouseEvent) => void
  onNew: () => void
  onExport?: () => void
  onImportPick?: () => void
  onExportBrief?: () => void
  onImportBriefPick?: () => void
  onRecognizeScreenshot?: () => void
  onCopyRequestId?: () => void
}

export function ChatTabs(props: ChatTabsProps): JSX.Element {
  const [menuOpen, setMenuOpen] = createSignal(false)
  /** Settings → Include thinking & tool trace (refresh when menu opens). */
  const [exportIncludeTrace, setExportIncludeTrace] = createSignal(
    ensureExportIncludeTraceDefault(),
  )
  let menuRoot: HTMLElement | undefined

  const hasMenu =
    () =>
      !!(
        props.onExport
        || props.onImportPick
        || props.onExportBrief
        || props.onImportBriefPick
        || props.onRecognizeScreenshot
        || props.onCopyRequestId
      )

  const refreshTracePref = () => {
    setExportIncludeTrace(readExportIncludeTrace())
  }

  const toggleMenu = () => {
    refreshTracePref()
    setMenuOpen((open) => !open)
  }

  createEffect(() => {
    if (!menuOpen()) return
    const onDoc = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (menuRoot?.contains(target)) return
      setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    onCleanup(() => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    })
  })

  const runAndClose = (action?: () => void) => {
    setMenuOpen(false)
    action?.()
  }

  return (
    <Box class="chat-tabs" role="tablist" aria-label={t("chat.agents")}>
      <Box class="chat-tabs-scroll">
        <For each={props.sessions}>
          {(s) => (
            <Button
              type="button"
              role="tab"
              class="chat-tab"
              classList={{ active: s.id === props.activeId }}
              aria-selected={s.id === props.activeId}
              title={props.titles[s.id] ?? t("chat.agent")}
              disabled={props.disabled}
              onClick={() => {
                if (s.id === props.activeId) return
                if (props.switchLocked) return
                props.onSelect(s)
              }}
            >
              <Text tag="span" class="chat-tab-label">
                {props.titles[s.id] ?? t("chat.agent")}
              </Text>
              <Show when={props.importedIds?.has(s.id)}>
                <Text tag="span" class="chat-tab-badge" title={t("chat.importedAgent")}>
                  {t("chat.imported")}
                </Text>
              </Show>
              <Show when={props.sessions.length > 1}>
                <Button
                  type="button"
                  class="chat-tab-close"
                  aria-label={t("chat.closeAgentTab")}
                  onClick={(e) => props.onClose(s.id, e)}
                >
                  <AppIcon name="x" size={12} />
                </Button>
              </Show>
            </Button>
          )}
        </For>
      </Box>

      <Box class="chat-tabs-actions">
        <Show when={props.onCollapse}>
          <Button
            type="button"
            class="chat-tab-action sheet-collapse"
            aria-label={t("chat.collapseChat")}
            title={t("chat.collapseChat")}
            disabled={props.disabled}
            onClick={() => props.onCollapse?.()}
          >
            <AppIcon name="chevron-left" size={14} />
          </Button>
        </Show>
        <Button
          type="button"
          class="chat-tab-action chat-tab-new"
          title={t("chat.newAgent")}
          aria-label={t("chat.newAgent")}
          disabled={props.disabled || props.switchLocked}
          onClick={() => props.onNew()}
        >
          <AppIcon name="plus" size={14} />
        </Button>
        <Show when={hasMenu()}>
          <Box
            class="chat-tabs-menu"
            ref={(el) => {
              menuRoot = el
            }}
          >
            <Button
              type="button"
              class="chat-tab-action chat-tab-menu-trigger"
              title={t("chat.chatActions")}
              aria-label={t("chat.chatActions")}
              aria-haspopup="menu"
              aria-expanded={menuOpen()}
              disabled={props.disabled}
              onClick={() => toggleMenu()}
            >
              <AppIcon name="ellipsis" size={14} />
            </Button>
            <Show when={menuOpen()}>
              <Box class="chat-tab-menu-popover" role="menu">
                <Show when={props.onImportPick}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onImportPick)}
                  >
                    {t("chat.importTranscript")}
                  </Button>
                </Show>
                <Show when={props.onExport}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item chat-tab-menu-item-row"
                    disabled={!props.activeId}
                    onClick={() => runAndClose(props.onExport)}
                  >
                    <Text tag="span">{t("chat.exportTranscript")}</Text>
                    <Show when={exportIncludeTrace()}>
                      <Text tag="span"
                        class="chat-tab-menu-if is-on"
                        title={t("chat.includesThinkingToolTrace")}
                      >
                        {t("chat.includesTraceBadge")}
                      </Text>
                    </Show>
                  </Button>
                </Show>
                <Show when={props.onImportBriefPick}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onImportBriefPick)}
                  >
                    {t("chat.importBrief")}
                  </Button>
                </Show>
                <Show when={props.onRecognizeScreenshot}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onRecognizeScreenshot)}
                  >
                    {t("chat.attachScreenshot")}
                  </Button>
                </Show>
                <Show when={props.onExportBrief}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    onClick={() => runAndClose(props.onExportBrief)}
                  >
                    {t("chat.exportBrief")}
                  </Button>
                </Show>
                <Show when={props.onCopyRequestId}>
                  <Button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={!props.activeId}
                    onClick={() => runAndClose(props.onCopyRequestId)}
                  >
                    {t("chat.copyRequestId")}
                  </Button>
                </Show>
              </Box>
            </Show>
          </Box>
        </Show>
      </Box>
    </Box>
  )
}
