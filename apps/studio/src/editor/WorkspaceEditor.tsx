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
import { CodeEditor } from "../vendor-ui/codemirror/CodeEditor"
import { MarkdownView } from "../vendor-ui/MarkdownView"
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
import { Box, Button, Text } from "../primitives"
import { cssVars } from "../lib/css-vars"
import { AppIcon } from "../app-icons"
import { t } from "../i18n"
import { ArchiveButton, ImportDropZone, ImportZipLink } from "./ArchiveButton"
import { countTreeFiles } from "./tree-count"
import { WaitProgress } from "./WaitProgress"
import "./editor-empty.css"

export type WorkspaceEditorProps = {
  projectId: string
  /** Bump to reload the file tree (shared side toolbar Refresh). */
  refreshTick?: number
}

function isMarkdownPath(filePath: string): boolean {
  return /\.(md|mdx|mdc|markdown)$/i.test(filePath)
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
    <Box tag="li" class="ws-tree-item" classList={{ "is-dir": isDir() }}>
      <Button
        type="button"
        class="ws-tree-row"
        classList={{ selected: isSelected() }}
        ref={(el) => cssVars(el, () => ({ "--ws-depth": String(props.depth) }))}
        onClick={() => {
          if (isDir()) setOpen((v) => !v)
          else props.onOpen(props.node.path)
        }}
      >
        <Text tag="span" class="ws-tree-glyph" aria-hidden="true">
          <Show when={isDir()}>
            <AppIcon name={open() ? "chevron-down" : "chevron-right"} size={12} />
          </Show>
        </Text>
        <Text tag="span" class="ws-tree-name">{props.node.name}</Text>
      </Button>
      <Show when={isDir() && open() && props.node.children?.length}>
        <Box tag="ul" class="ws-tree-children">
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
        </Box>
      </Show>
    </Box>
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
  const [importStartedAt, setImportStartedAt] = createSignal<number | null>(null)
  let bodyEl: HTMLElement | undefined

  const onImportStart = () => setImportStartedAt(Date.now())
  const onImported = () => {
    setImportStartedAt(null)
    void loadTree()
  }
  const onImportError = (message: string) => {
    setImportStartedAt(null)
    setError(message)
  }

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
    <Box class="workspace-editor">
      <Show when={error()}>
        <Box class="ws-editor-banner">{error()}</Box>
      </Show>

      <Box
        class="ws-editor-body"
        classList={{
          "is-splitting": splitting(),
          "tree-collapsed": !treeOpen(),
        }}
        ref={(el) => {
          bodyEl = el
          cssVars(el, () => ({ "--ws-tree-width": `${treePct()}%` }))
        }}
      >
        <Box tag="aside" class="ws-tree-pane" aria-label={t("editor.workspaceFiles")} aria-hidden={!treeOpen()}>
          <Show
            when={tree().length > 0}
            fallback={
              <Box class="pane-empty compact ws-tree-empty">
                <Text>{t("editor.emptyLead")}</Text>
                <ImportZipLink projectId={props.projectId} onError={onImportError} onImported={onImported} onImportStart={onImportStart} />
              </Box>
            }
          >
            <Box tag="ul" class="ws-tree">
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
            </Box>
          </Show>
        </Box>
        <Box
          class="ws-editor-split"
          role="separator"
          aria-orientation="vertical"
          aria-label={t("editor.resizeFileTreeAnd")}
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
        <Box class="ws-code-pane">
          <Show
            when={selected()}
            fallback={
              <>
                <Box class="ws-code-toolbar">
                  <Text tag="span" class="ws-code-path">{t("editor.selectAFile")}</Text>
                  <Box class="ws-code-toolbar-right">
                    <ArchiveButton projectId={props.projectId} empty={countTreeFiles(tree()) === 0} onError={onImportError} onImported={onImported} onImportStart={onImportStart} />
                    <Button
                      type="button"
                      class="btn ghost compact ws-tree-toggle"
                      title={treeOpen() ? t("editor.hideFileTree") : t("editor.showFileTree")}
                      aria-label={treeOpen() ? t("editor.hideFileTree") : t("editor.showFileTree")}
                      aria-pressed={treeOpen()}
                      onClick={toggleTree}
                    >
                      <Show when={treeOpen()} fallback={<AppIcon name="panel-left-open" class="ws-tree-toggle-icon" />}>
                        <AppIcon name="panel-left-close" class="ws-tree-toggle-icon" />
                      </Show>
                    </Button>
                  </Box>
                </Box>
                <Show
                  when={countTreeFiles(tree()) === 0}
                  fallback={
                    <Box class="pane-empty">
                      <Text>{t("editor.selectAFileFrom")}</Text>
                    </Box>
                  }
                >
                  <Show
                    when={importStartedAt()}
                    fallback={
                      <ImportDropZone projectId={props.projectId} onError={onImportError} onImported={onImported} onImportStart={onImportStart} />
                    }
                  >
                    <Box class="pane-empty">
                      <WaitProgress
                        title={t("editor.zipImportTitle")}
                        step={t("editor.zipImportStep")}
                        hint={t("editor.zipImportWaitHint")}
                        startedAt={importStartedAt() ?? Date.now()}
                      />
                    </Box>
                  </Show>
                </Show>
              </>
            }
          >
            {(path) => (
              <>
                <Box class="ws-code-toolbar">
                  <Text tag="span" class="ws-code-path" title={path()}>
                    {path()}
                    <Show when={dirty()}>
                      <Text tag="span" class="ws-dirty" title={t("editor.unsaved")}>
                        *
                      </Text>
                    </Show>
                  </Text>
                  <Box class="ws-code-toolbar-right">
                    <Show when={canPreview()}>
                      <Box class="ws-view-toggle" role="group" aria-label={t("projects.view")}>
                        <Button
                          type="button"
                          class="btn ghost compact"
                          classList={{ active: view() === "edit" }}
                          onClick={() => setView("edit")}
                        >
                          {t("common.edit")}
                        </Button>
                        <Button
                          type="button"
                          class="btn ghost compact"
                          classList={{ active: view() === "preview" }}
                          onClick={() => setView("preview")}
                        >
                          {t("editor.preview")}
                        </Button>
                      </Box>
                    </Show>
                    <ArchiveButton projectId={props.projectId} empty={countTreeFiles(tree()) === 0} onError={onImportError} onImported={onImported} onImportStart={onImportStart} />
                    <Button
                      type="button"
                      class="btn ghost compact ws-tree-toggle"
                      title={treeOpen() ? t("editor.hideFileTree") : t("editor.showFileTree")}
                      aria-label={treeOpen() ? t("editor.hideFileTree") : t("editor.showFileTree")}
                      aria-pressed={treeOpen()}
                      onClick={toggleTree}
                    >
                      <Show when={treeOpen()} fallback={<AppIcon name="panel-left-open" class="ws-tree-toggle-icon" />}>
                        <AppIcon name="panel-left-close" class="ws-tree-toggle-icon" />
                      </Show>
                    </Button>
                    <Button
                      type="button"
                      class="btn primary compact"
                      disabled={!dirty() || saving() || loading()}
                      onClick={() => void save()}
                    >
                      {saving() ? t("common.saving") : t("common.save")}
                    </Button>
                  </Box>
                </Box>
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
                  <MarkdownView class="ws-md-preview chat-md" source={draft()} />
                </Show>
              </>
            )}
          </Show>
        </Box>
      </Box>
    </Box>
  )
}

export default WorkspaceEditor
