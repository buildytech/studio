import { Show, lazy, type JSX } from "solid-js"
import { tset } from "../../i18n/settings"
import { Box, Text } from "../../primitives"
import { ServerSettings } from "../../ServerSettings"
import type { SettingsSectionProps } from "../registry"

const ServerHelp = lazy(() => import("../../ServerHelp"))

/**
 * Server (desktop + server): the desktop app's SSH connection to the server (the same card as the start screen) and
 * the server help (SSH keys, backups). In a plain browser there is no desktop app: only where the Studio comes from.
 */
export default function Server(props: SettingsSectionProps): JSX.Element {
  return (
    <Box class="settings-cards">
      <Show
        when={props.ctx.conn}
        fallback={
          <Box tag="section" class="settings-card">
            <Text class="settings-card-sub">{tset("server.browser")}</Text>
            <Text tag="code" class="settings-masked">{location.origin}</Text>
          </Box>
        }
      >
        {(c) => (
          <>
            <ServerSettings conn={c()} onChange={props.onConnChange} />
            <ServerHelp conn={c()} />
          </>
        )}
      </Show>
    </Box>
  )
}
