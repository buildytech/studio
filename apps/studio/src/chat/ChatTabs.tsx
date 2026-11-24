import { For, Show, createEffect, createSignal, onCleanup, type JSX } from "solid-js"
import type { AgentSession } from "../api"
import {
  ensureExportIncludeTraceDefault,
  readExportIncludeTrace,
} from "../chat-export-prefs"

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
  let menuRoot: HTMLDivElement | undefined

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
    <div class="chat-tabs" role="tablist" aria-label="Agents">
      <div class="chat-tabs-scroll">
        <For each={props.sessions}>
          {(s) => (
            <button
              type="button"
              role="tab"
              class="chat-tab"
              classList={{ active: s.id === props.activeId }}
              aria-selected={s.id === props.activeId}
              title={props.titles[s.id] ?? "Agent"}
              disabled={props.disabled}
              onClick={() => {
                if (s.id === props.activeId) return
                if (props.switchLocked) return
                props.onSelect(s)
              }}
            >
              <span class="chat-tab-label">
                {props.titles[s.id] ?? "Agent"}
              </span>
              <Show when={props.importedIds?.has(s.id)}>
                <span class="chat-tab-badge" title="Imported agent">
                  Imported
                </span>
              </Show>
              <Show when={props.sessions.length > 1}>
                <button
                  type="button"
                  class="chat-tab-close"
                  aria-label="Close agent tab"
                  onClick={(e) => props.onClose(s.id, e)}
                >
                  ×
                </button>
              </Show>
            </button>
          )}
        </For>
      </div>

      <div class="chat-tabs-actions">
        <Show when={props.onCollapse}>
          <button
            type="button"
            class="chat-tab-action sheet-collapse"
            aria-label="Collapse chat"
            title="Collapse chat"
            disabled={props.disabled}
            onClick={() => props.onCollapse?.()}
          >
            ‹
          </button>
        </Show>
        <button
          type="button"
          class="chat-tab-action chat-tab-new"
          title="New Agent"
          aria-label="New Agent"
          disabled={props.disabled || props.switchLocked}
          onClick={() => props.onNew()}
        >
          +
        </button>
        <Show when={hasMenu()}>
          <div
            class="chat-tabs-menu"
            ref={(el) => {
              menuRoot = el
            }}
          >
            <button
              type="button"
              class="chat-tab-action chat-tab-menu-trigger"
              title="Chat actions"
              aria-label="Chat actions"
              aria-haspopup="menu"
              aria-expanded={menuOpen()}
              disabled={props.disabled}
              onClick={() => toggleMenu()}
            >
              ⋯
            </button>
            <Show when={menuOpen()}>
              <div class="chat-tab-menu-popover" role="menu">
                <Show when={props.onImportPick}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onImportPick)}
                  >
                    Import transcript
                  </button>
                </Show>
                <Show when={props.onExport}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item chat-tab-menu-item-row"
                    disabled={!props.activeId}
                    onClick={() => runAndClose(props.onExport)}
                  >
                    <span>Export transcript</span>
                    <Show when={exportIncludeTrace()}>
                      <span
                        class="chat-tab-menu-if is-on"
                        title="Includes thinking & tool trace (Settings)"
                      >
                        IF
                      </span>
                    </Show>
                  </button>
                </Show>
                <Show when={props.onImportBriefPick}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onImportBriefPick)}
                  >
                    Import brief
                  </button>
                </Show>
                <Show when={props.onRecognizeScreenshot}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={props.switchLocked}
                    onClick={() => runAndClose(props.onRecognizeScreenshot)}
                  >
                    Attach screenshot
                  </button>
                </Show>
                <Show when={props.onExportBrief}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    onClick={() => runAndClose(props.onExportBrief)}
                  >
                    Export brief
                  </button>
                </Show>
                <Show when={props.onCopyRequestId}>
                  <button
                    type="button"
                    role="menuitem"
                    class="chat-tab-menu-item"
                    disabled={!props.activeId}
                    onClick={() => runAndClose(props.onCopyRequestId)}
                  >
                    Copy Request ID
                  </button>
                </Show>
              </div>
            </Show>
          </div>
        </Show>
      </div>
    </div>
  )
}
