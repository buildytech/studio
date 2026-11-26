import { createSignal, onCleanup, type JSX } from "solid-js"
import { AppIcon } from "../app-icons"
import { useHost } from "../host/context"
import { t } from "../i18n"
import { Button, Text } from "../primitives"
import { downloadArchive } from "./archive"

/** Editor toolbar: the project as a ZIP (no git needed). Errors go to the editor's banner. */
export function ArchiveButton(props: { projectId: string; onError: (message: string) => void }): JSX.Element {
  const host = useHost()
  const [busy, setBusy] = createSignal(false)
  const [status, setStatus] = createSignal("")
  let timer: ReturnType<typeof setTimeout> | undefined
  onCleanup(() => clearTimeout(timer))

  const run = async () => {
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

  return (
    <>
      <Button type="button" class="btn ghost compact ws-zip" disabled={busy()} title={t("editor.zipHint")} onClick={() => void run()}>
        <AppIcon name="download" size={14} class="ws-zip-icon" />
        <Text tag="span">{busy() ? t("editor.zipPreparing") : t("editor.zipDownload")}</Text>
      </Button>
      <Text tag="span" role="status" class="sr-only">{status()}</Text>
    </>
  )
}
