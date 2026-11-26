import { createSignal, type JSX } from "solid-js"
import type { DesktopConnection } from "@buildy/agent-contract"
import { useHost } from "./host/context"
import { t } from "./i18n"
import { Box, Button, Link, Text } from "./primitives"

/** The releases page of the desktop app and the server (display + link; not user content). */
export const RELEASES_URL = "https://github.com/buildytech/vibechat-desktop/releases/latest"

/**
 * Shown instead of the Studio when the app and the server do not share a protocol (`protocol_*` problems): which
 * side is old, where the update comes from, and the way back to this computer meanwhile.
 */
export function UpdateScreen(props: {
  conn: DesktopConnection
  onChange: (conn: DesktopConnection) => void
}): JSX.Element {
  const host = useHost()
  const [busy, setBusy] = createSignal(false)
  const appOld = () => props.conn.problem?.code === "protocol_app_old"
  const run = async (op: () => Promise<DesktopConnection>) => {
    if (busy()) return
    setBusy(true)
    try {
      props.onChange(await op())
    } finally {
      setBusy(false)
    }
  }
  return (
    <Box tag="main" class="projects-page settings-page">
      <Box class="projects-hero">
        <Text tag="h1" class="projects-title">{t("update.title")}</Text>
        <Text class="projects-sub">{t("update.lead")}</Text>
      </Box>
      <Box tag="section" class="settings-card">
        <Text class="settings-card-sub">
          {appOld()
            ? t("update.appOld", { app: props.conn.appProtocol, min: props.conn.server?.minClientProtocol ?? "?" })
            : t("update.serverOld", { server: props.conn.server?.protocol ?? "?" })}
        </Text>
        <Text class="settings-masked">
          {t("update.releases")} <Link href={RELEASES_URL} external>{RELEASES_URL}</Link>
        </Text>
        <Box class="settings-actions">
          <Button class="btn primary" type="button" disabled={busy()}
            onClick={() => void run(() => host.desktopConnect({ address: props.conn.target?.address ?? "", user: props.conn.target?.user ?? "" }))}>
            {t("update.retry")}
          </Button>
          <Button class="btn ghost" type="button" disabled={busy()} onClick={() => void run(() => host.desktopDisconnect(false))}>
            {t("update.useLocal")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
