import { createSignal, onCleanup, Show, type JSX } from "solid-js"
import { AppIcon } from "../app-icons"
import { useHost } from "../host/context"
import { t } from "../i18n"
import { Box, Button, Input, Text } from "../primitives"
import { downloadArchive } from "./archive"

/** Editor toolbar: Import ZIP when the project has no files, otherwise Download ZIP. Errors go to the editor's banner. */
export function ArchiveButton(props: {
  projectId: string
  empty: boolean
  onError: (message: string) => void
  onImported?: () => void
}): JSX.Element {
  const host = useHost()
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal("")
  let timer: ReturnType<typeof setTimeout> | undefined
  let input: HTMLInputElement | undefined
  onCleanup(() => clearTimeout(timer))

  const runDownload = async () => {
    if (busy()) return
    setBusy(true)
    setStatus(t("editor.zipPreparing"))
    props.onError("")
    try {
      const r = await downloadArchive(host, props.projectId, (url) => window.location.assign(url))
      setStatus(r.kind === "saved" ? t("editor.zipSaved", { file: r.file ?? "" }) : "")
    } catch (e) {
      setStatus("")
      props.onError(t("editor.zipFailed", { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
      clearTimeout(timer)
      timer = setTimeout(() => setStatus(""), 4000)
    }
  }

  const runImport = async (file: File | undefined) => {
    if (busy() || !file) return
    setBusy(true)
    setStatus(t("editor.zipImportPreparing"))
    props.onError("")
    try {
      await host.importProjectZip(props.projectId, file)
      setStatus(t("editor.zipImported"))
      props.onImported?.()
    } catch (e) {
      setStatus("")
      props.onError(t("editor.zipImportFailed", { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
      clearTimeout(timer)
      timer = setTimeout(() => setStatus(""), 4000)
      if (input) input.value = ""
    }
  }

  return (
    <>
      <Show
        when={props.empty}
        fallback={
          <Button type="button" class="btn ghost compact ws-zip" disabled={busy()} title={t("editor.zipHint")} onClick={() => void runDownload()}>
            <AppIcon name="download" size={14} class="ws-zip-icon" />
            <Text tag="span">{busy() ? t("editor.zipPreparing") : t("editor.zipDownload")}</Text>
          </Button>
        }
      >
        <Input
          ref={(el) => {
            input = el
          }}
          type="file"
          accept=".zip,application/zip"
          hidden
          onChange={(e) => void runImport(e.currentTarget.files?.[0])}
        />
        <Button
          type="button"
          class="btn ghost compact ws-zip"
          disabled={busy()}
          title={t("editor.zipImportHint")}
          onClick={() => input?.click()}
        >
          <AppIcon name="upload" size={14} class="ws-zip-icon" />
          <Text tag="span">{busy() ? t("editor.zipImportPreparing") : t("editor.zipImport")}</Text>
        </Button>
      </Show>
      <Text tag="span" role="status" class="sr-only">{status()}</Text>
    </>
  )
}

/** Empty editor pane: drop a ZIP or use the same import action as the toolbar button. */
export function ImportDropZone(props: {
  projectId: string
  onError: (message: string) => void
  onImported?: () => void
}): JSX.Element {
  const host = useHost()
  const [over, setOver] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  let input: HTMLInputElement | undefined

  const run = async (file: File | undefined) => {
    if (busy() || !file) return
    setBusy(true)
    props.onError("")
    try {
      await host.importProjectZip(props.projectId, file)
      props.onImported?.()
    } catch (e) {
      props.onError(t("editor.zipImportFailed", { reason: e instanceof Error ? e.message : String(e) }))
    } finally {
      setBusy(false)
      if (input) input.value = ""
    }
  }

  return (
    <Box
      class="pane-empty ws-import-drop"
      classList={{ "is-over": over(), "is-busy": busy() }}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const file = e.dataTransfer?.files?.[0]
        void run(file)
      }}
    >
      <Input
        ref={(el) => {
          input = el
        }}
        type="file"
        accept=".zip,application/zip"
        hidden
        aria-label={t("editor.zipImport")}
        onChange={(e) => void run(e.currentTarget.files?.[0])}
      />
      <Text tag="span">{busy() ? t("editor.zipImportPreparing") : t("editor.zipImportDrop")}</Text>
      <Button type="button" class="btn ghost compact" disabled={busy()} onClick={() => input?.click()}>
        <Text tag="span">{t("editor.zipImportBrowse")}</Text>
      </Button>
    </Box>
  )
}
