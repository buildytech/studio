import {
  createEffect,
  createSignal,
  onCleanup,
  untrack,
  type JSX,
} from "solid-js"
import { basicSetup } from "codemirror"
import { Compartment, EditorState } from "@codemirror/state"
import { EditorView, keymap } from "@codemirror/view"
import { languageSupportForPath } from "./languages"
import { studioEditorTheme, studioSyntaxHighlighting } from "./theme"

export type CodeEditorProps = {
  /** Workspace-relative path — drives language mode. */
  filePath: string
  /** Document text (reset when file opens / external replace). */
  doc: string
  disabled?: boolean
  onChange: (value: string) => void
  onSave?: () => void
}

/**
 * CodeMirror 6 host for Studio. Owned by the Editor lazy chunk.
 */
export function CodeEditor(props: CodeEditorProps): JSX.Element {
  const [host, setHost] = createSignal<HTMLDivElement>()
  let view: EditorView | undefined
  const langCompartment = new Compartment()
  const editableCompartment = new Compartment()
  /** Skip echoing CM→parent when we just applied a parent doc. */
  let applyingExternal = false
  let lastPath = ""

  // Mount once per host element; do not track doc/path (synced below).
  createEffect(() => {
    const el = host()
    if (!el) return

    const initialDoc = untrack(() => props.doc)
    const initialPath = untrack(() => props.filePath)
    const initiallyEditable = untrack(() => !props.disabled)

    const v = new EditorView({
      parent: el,
      state: EditorState.create({
        doc: initialDoc,
        extensions: [
          basicSetup,
          studioEditorTheme,
          studioSyntaxHighlighting,
          langCompartment.of(languageSupportForPath(initialPath)),
          editableCompartment.of(EditorView.editable.of(initiallyEditable)),
          EditorView.updateListener.of((update) => {
            if (!update.docChanged || applyingExternal) return
            props.onChange(update.state.doc.toString())
          }),
          keymap.of([
            {
              key: "Mod-s",
              run: () => {
                props.onSave?.()
                return true
              },
            },
          ]),
        ],
      }),
    })
    view = v
    lastPath = initialPath

    onCleanup(() => {
      v.destroy()
      if (view === v) view = undefined
    })
  })

  createEffect(() => {
    const nextDoc = props.doc
    const path = props.filePath
    const disabled = Boolean(props.disabled)
    const v = view
    if (!v) return

    if (path !== lastPath) {
      lastPath = path
      applyingExternal = true
      v.dispatch({
        changes: { from: 0, to: v.state.doc.length, insert: nextDoc },
        effects: [
          langCompartment.reconfigure(languageSupportForPath(path)),
        ],
      })
      applyingExternal = false
    } else {
      const current = v.state.doc.toString()
      if (current !== nextDoc) {
        applyingExternal = true
        v.dispatch({
          changes: { from: 0, to: v.state.doc.length, insert: nextDoc },
        })
        applyingExternal = false
      }
    }

    v.dispatch({
      effects: editableCompartment.reconfigure(
        EditorView.editable.of(!disabled),
      ),
    })
  })

  return <div class="ws-code-mirror" ref={setHost} />
}
