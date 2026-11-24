import {
  For,
  Show,
  createEffect,
  createSignal,
  type JSX,
} from "solid-js"
import {
  api,
  type WorkspaceTreeNode,
} from "../api"
import { hydrateMermaid, renderMarkdown } from "../markdown"
import { CodeEditor } from "./CodeEditor"
import {
  clampTreePct,
  persistTreeOpen,
  persistTreePct,
  readTreeOpen,
  readTreePct,
  treePctFromPointer,
  MAX_TREE_PCT,
  MIN_TREE_PCT,
} from "./tree-split"

export type WorkspaceEditorProps = {
  projectId: string
  /** Bump to reload the file tree (shared side toolbar Refresh). */
  refreshTick?: number
}

/** Lucide-style panel-left-close (tree visible → collapse). */
function PanelLeftCloseIcon(): JSX.Element {
  return (
    <svg
      class="ws-tree-toggle-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m16 15-3-3 3-3" />
    </svg>
  )
}

/** Lucide-style panel-left-open (tree hidden → expand). */
function PanelLeftOpenIcon(): JSX.Element {
  return (
    <svg
      class="ws-tree-toggle-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
      <path d="m14 9 3 3-3 3" />
    </svg>
  )
}

function isMarkdownPath(filePath: string): boolean {
  return /\.(md|mdx|markdown)$/i.test(filePath)
}

function TreeNode(props: {
  node: WorkspaceTreeNode
  depth: number
  selected: string | null
  onOpen: (path: string) => void
}): JSX.Element {
  const [open, setOpen] = createSignal(props.depth < 2)
  const isDir = () => props.node.type === "dir"
  const isSelected = () =>
    !isDir() && props.selected === props.node.path

  return (
    <li class="ws-tree-item" classList={{ "is-dir": isDir() }}>
      <button
        type="button"
        class="ws-tree-row"
        classList={{ selected: isSelected() }}
        style={{ "padding-left": `${0.4 + props.depth * 0.75}rem` }}
        onClick={() => {
          if (isDir()) setOpen((v) => !v)
          else props.onOpen(props.node.path)
        }}
      >
        <span class="ws-tree-glyph" aria-hidden="true">
          {isDir() ? (open() ? "▾" : "▸") : "·"}
        </span>
        <span class="ws-tree-name">{props.node.name}</span>
      </button>
      <Show when={isDir() && open() && props.node.children?.length}>
        <ul class="ws-tree-children">
          <For each={props.node.children}>
            {(child) => (
              <TreeNode
                node={child}
                depth={props.depth + 1}
                selected={props.selected}
                onOpen={props.onOpen}
              />
            )}
          </For>
        </ul>
      </Show>
    </li>
  )
}

/**
 * Studio workspace surface: file tree + CodeMirror editor.
 * Markdown files can toggle a GFM + Mermaid preview (same pipeline as chat).
 */
export function WorkspaceEditor(props: WorkspaceEditorProps): JSX.Element {
  const [tree, setTree] = createSignal<WorkspaceTreeNode[]>([])
  const [selected, setSelected] = createSignal<string | null>(null)
  const [content, setContent] = createSignal("")
  const [draft, setDraft] = createSignal("")
  const [dirty, setDirty] = createSignal(false)
  const [loading, setLoading] = createSignal(false)
  const [saving, setSaving] = createSignal(false)
  const [error, setError] = createSignal("")
  const [view, setView] = createSignal<"edit" | "preview">("edit")
  const [treePct, setTreePct] = createSignal(readTreePct())
  const [treeOpen, setTreeOpen] = createSignal(readTreeOpen())
  const [splitting, setSplitting] = createSignal(false)
  let mdRoot: HTMLDivElement | undefined
  let bodyEl: HTMLDivElement | undefined

  const toggleTree = () => {
    setTreeOpen((open) => {
      const next = !open
      persistTreeOpen(next)
      return next
    })
  }

  const startTreeSplit = (event: PointerEvent) => {
    if (!bodyEl || !treeOpen()) return
    event.preventDefault()
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
    setSplitting(true)
    let latest = treePct()

    const onMove = (ev: PointerEvent) => {
      if (!bodyEl) return
      latest = treePctFromPointer(ev.clientX, bodyEl.getBoundingClientRect())
      setTreePct(latest)
    }
    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId)
      handle.removeEventListener("pointermove", onMove)
      handle.removeEventListener("pointerup", onUp)
      handle.removeEventListener("pointercancel", onUp)
      setSplitting(false)
      persistTreePct(latest)
    }
    handle.addEventListener("pointermove", onMove)
    handle.addEventListener("pointerup", onUp)
    handle.addEventListener("pointercancel", onUp)
  }

  const loadTree = async () => {
    setError("")
    try {
      const res = await api.listProjectFiles(props.projectId)
      setTree(res.tree)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load files")
    }
  }

  createEffect(() => {
    const id = props.projectId
    setSelected(null)
    setContent("")
    setDraft("")
    setDirty(false)
    setView("edit")
    void loadTree()
    void id
  })

  createEffect(() => {
    const tick = props.refreshTick ?? 0
    if (tick <= 0) return
    void loadTree()
  })

  createEffect(() => {
    const el = mdRoot
    const text = draft()
    if (!el || view() !== "preview") return
    el.innerHTML = renderMarkdown(text)
    void hydrateMermaid(el)
  })

  const openFile = async (filePath: string) => {
    if (dirty() && selected() && selected() !== filePath) {
      const leave = window.confirm(
        "Discard unsaved changes to the current file?",
      )
      if (!leave) return
    }
    setLoading(true)
    setError("")
    setView("edit")
    try {
      const res = await api.readProjectFile(props.projectId, filePath)
      setSelected(res.path)
      setContent(res.content)
      setDraft(res.content)
      setDirty(false)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not open file")
    } finally {
      setLoading(false)
    }
  }

  const save = async () => {
    const filePath = selected()
    if (!filePath || !dirty()) return
    setSaving(true)
    setError("")
    try {
      await api.writeProjectFile(props.projectId, filePath, draft())
      setContent(draft())
      setDirty(false)
      void loadTree()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save file")
    } finally {
      setSaving(false)
    }
  }

  const onDraftInput = (value: string) => {
    setDraft(value)
    setDirty(value !== content())
  }

  const canPreview = () => {
    const p = selected()
    return Boolean(p && isMarkdownPath(p))
  }

  return (
    <div class="workspace-editor">
      <Show when={error()}>
        <div class="ws-editor-banner">{error()}</div>
      </Show>

      <div
        class="ws-editor-body"
        classList={{
          "is-splitting": splitting(),
          "tree-collapsed": !treeOpen(),
        }}
        style={{ "--ws-tree-width": `${treePct()}%` }}
        ref={(el) => {
          bodyEl = el
        }}
      >
        <aside class="ws-tree-pane" aria-label="Workspace files" aria-hidden={!treeOpen()}>
          <Show
            when={tree().length > 0}
            fallback={<div class="pane-empty compact">No files yet</div>}
          >
            <ul class="ws-tree">
              <For each={tree()}>
                {(node) => (
                  <TreeNode
                    node={node}
                    depth={0}
                    selected={selected()}
                    onOpen={(p) => void openFile(p)}
                  />
                )}
              </For>
            </ul>
          </Show>
        </aside>
        <div
          class="ws-editor-split"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize file tree and editor"
          aria-valuemin={MIN_TREE_PCT}
          aria-valuemax={MAX_TREE_PCT}
          aria-valuenow={Math.round(treePct())}
          aria-hidden={!treeOpen()}
          tabindex={treeOpen() ? 0 : -1}
          onPointerDown={(e) => startTreeSplit(e)}
          onKeyDown={(e) => {
            if (!treeOpen()) return
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return
            e.preventDefault()
            const delta = e.key === "ArrowLeft" ? -2 : 2
            const next = clampTreePct(treePct() + delta)
            setTreePct(next)
            persistTreePct(next)
          }}
        />
        <div class="ws-code-pane">
          <Show
            when={selected()}
            fallback={
              <>
                <div class="ws-code-toolbar">
                  <span class="ws-code-path">Select a file</span>
                  <div class="ws-code-toolbar-right">
                    <button
                      type="button"
                      class="btn ghost compact ws-tree-toggle"
                      title={treeOpen() ? "Hide file tree" : "Show file tree"}
                      aria-label={treeOpen() ? "Hide file tree" : "Show file tree"}
                      aria-pressed={treeOpen()}
                      onClick={toggleTree}
                    >
                      <Show when={treeOpen()} fallback={<PanelLeftOpenIcon />}>
                        <PanelLeftCloseIcon />
                      </Show>
                    </button>
                  </div>
                </div>
                <div class="pane-empty">
                  <p>Select a file from the tree to edit.</p>
                </div>
              </>
            }
          >
            {(path) => (
              <>
                <div class="ws-code-toolbar">
                  <span class="ws-code-path" title={path()}>
                    {path()}
                    <Show when={dirty()}>
                      <span class="ws-dirty" title="Unsaved">
                        *
                      </span>
                    </Show>
                  </span>
                  <div class="ws-code-toolbar-right">
                    <Show when={canPreview()}>
                      <div class="ws-view-toggle" role="group" aria-label="View">
                        <button
                          type="button"
                          class="btn ghost compact"
                          classList={{ active: view() === "edit" }}
                          onClick={() => setView("edit")}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          class="btn ghost compact"
                          classList={{ active: view() === "preview" }}
                          onClick={() => setView("preview")}
                        >
                          Preview
                        </button>
                      </div>
                    </Show>
                    <button
                      type="button"
                      class="btn ghost compact ws-tree-toggle"
                      title={treeOpen() ? "Hide file tree" : "Show file tree"}
                      aria-label={treeOpen() ? "Hide file tree" : "Show file tree"}
                      aria-pressed={treeOpen()}
                      onClick={toggleTree}
                    >
                      <Show when={treeOpen()} fallback={<PanelLeftOpenIcon />}>
                        <PanelLeftCloseIcon />
                      </Show>
                    </button>
                    <button
                      type="button"
                      class="btn primary compact"
                      disabled={!dirty() || saving() || loading()}
                      onClick={() => void save()}
                    >
                      {saving() ? "Saving…" : "Save"}
                    </button>
                  </div>
                </div>
                <Show
                  when={view() === "preview" && canPreview()}
                  fallback={
                    <CodeEditor
                      filePath={path()}
                      doc={draft()}
                      disabled={loading()}
                      onChange={onDraftInput}
                      onSave={() => void save()}
                    />
                  }
                >
                  <div
                    class="ws-md-preview chat-md"
                    ref={(el) => {
                      mdRoot = el
                    }}
                  />
                </Show>
              </>
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}

export default WorkspaceEditor
