import { Show, type JSX } from "solid-js"
import { tset } from "../../i18n/settings"
import { Box, Link, Text } from "../../primitives"
import type { SettingsSectionProps } from "../registry"

export const RELEASES_URL = "https://github.com/buildytech/vibechat-desktop/releases"

/** About (desktop + server): the app's and the server's versions and protocol, and where releases are. */
export default function About(props: SettingsSectionProps): JSX.Element {
  const unknown = () => tset("about.unknown")
  return (
    <Box class="settings-cards">
      <Box tag="section" class="settings-card">
        <Box tag="dl" class="settings-facts">
          <Box tag="dt">{tset("about.app")}</Box>
          <Box tag="dd">{props.ctx.conn?.appVersion ?? tset("about.browser")}</Box>
          <Box tag="dt">{tset("about.server")}</Box>
          <Box tag="dd">{props.ctx.conn?.server?.version ?? props.ctx.caps?.version ?? unknown()}</Box>
          <Box tag="dt">{tset("about.seam")}</Box>
          <Box tag="dd">{props.ctx.caps?.seam ?? unknown()}</Box>
          <Show when={props.ctx.conn?.server}>
            {(s) => (
              <>
                <Box tag="dt">{tset("about.protocol")}</Box>
                <Box tag="dd">{`${s().protocol} (≥ ${s().minClientProtocol})`}</Box>
              </>
            )}
          </Show>
        </Box>
        <Box class="settings-actions">
          <Link class="btn ghost" href={RELEASES_URL} target="_blank" rel="noopener noreferrer">{tset("about.releases")}</Link>
        </Box>
      </Box>
    </Box>
  )
}
