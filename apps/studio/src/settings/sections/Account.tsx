import { Show, createResource, type JSX } from "solid-js"
import { A } from "@solidjs/router"
import { api } from "../../api"
import { t } from "../../i18n"
import { tset } from "../../i18n/settings"
import { Box, Text } from "../../primitives"

/** Account (server): the Cursor account the agent runs as (read-only; the key lives in Models and keys). */
export default function Account(): JSX.Element {
  const [account] = createResource(() => api.cursorAccount().then((r) => r.account).catch(() => null))
  return (
    <Box class="settings-cards">
      <Box tag="section" class="settings-card" aria-labelledby="settings-account-title">
        <Text tag="h2" id="settings-account-title" class="settings-card-title">{tset("account.cursor")}</Text>
        <Show when={!account.loading} fallback={<Text class="muted">{t("common.loading")}</Text>}>
          <Show
            when={account()}
            fallback={
              <>
                <Text class="settings-card-sub">{tset("account.none")}</Text>
                <A class="btn ghost" href="/settings/models">{tset("account.openModels")}</A>
              </>
            }
          >
            {(a) => (
              <Box tag="dl" class="settings-facts">
                <Box tag="dt">{tset("account.name")}</Box>
                <Box tag="dd">{a().displayName ?? "—"}</Box>
                <Box tag="dt">{tset("account.email")}</Box>
                <Box tag="dd">{a().email ?? "—"}</Box>
              </Box>
            )}
          </Show>
        </Show>
      </Box>
      <Box tag="section" class="settings-card">
        <Text class="settings-card-sub">{tset("account.local")}</Text>
      </Box>
    </Box>
  )
}
