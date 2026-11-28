import { For, Show, Suspense, createEffect, createResource, createSignal, lazy, type Component, type JSX } from "solid-js"
import { A, useNavigate, useParams } from "@solidjs/router"
import type { DesktopConnection } from "@buildy/agent-contract"
import { api } from "../api"
import { SettingsIcon } from "../app-icons/settings-icons"
import { loadDesktopConnection } from "../desktop-connection"
import { t } from "../i18n"
import { tset, type SettingsKey } from "../i18n/settings"
import { Box, Input, Text } from "../primitives"
import { groupSections, resolveSection, searchSections, visibleSections, type SettingsContext, type SettingsSection, type SettingsSectionProps } from "./registry"
import { DEFAULT_SETTINGS_SECTION, SETTINGS_SECTIONS } from "./sections"
import "./settings.css"

const components = new Map<string, Component<SettingsSectionProps>>()
function sectionComponent(s: SettingsSection): Component<SettingsSectionProps> {
  let c = components.get(s.id)
  if (!c) {
    c = lazy(s.load)
    components.set(s.id, c)
  }
  return c
}

/**
 * Settings (ADR 0007): the section menu on the left (grouped, searchable), the chosen section on the right, one URL
 * per section (/settings/<id>). Everything comes from the registry (sections.ts); this page knows no section.
 */
export default function SettingsPage(): JSX.Element {
  const params = useParams<{ section?: string }>()
  const navigate = useNavigate()
  const [conn, setConn] = createSignal<DesktopConnection | null>(null)
  void loadDesktopConnection(api.desktopConnection).then(setConn).catch(() => setConn(null))
  const [caps] = createResource(() => api.hostCapabilities().catch(() => null))
  const ctx = (): SettingsContext => ({ conn: conn(), caps: caps() ?? null })
  const sections = () => visibleSections(SETTINGS_SECTIONS, ctx())
  const [query, setQuery] = createSignal("")
  const shown = () => searchSections(sections(), query(), tset)
  const active = () => resolveSection(sections(), params.section)

  // /settings and an unknown section land on a real URL, so the menu link of the open section is aria-current.
  createEffect(() => {
    const s = active()
    if (s && params.section !== s.id) navigate(`/settings/${s.id ?? DEFAULT_SETTINGS_SECTION}`, { replace: true })
  })

  return (
    <Box class="settings-screen">
      <Box tag="header" class="settings-top">
        <Box class="brand-lockup">
          <A href="/" class="brand">{t("brand.name")}</A>
          <Text tag="span" class="brand-tag">{tset("title")}</Text>
        </Box>
        <A class="btn ghost settings-back" href="/">
          <SettingsIcon name="arrow-left" size={14} />
          <Text tag="span">{tset("back")}</Text>
        </A>
      </Box>
      <Box class="settings-layout">
        <Box tag="aside" class="settings-aside">
          <Box tag="search" class="settings-search">
            <SettingsIcon name="search" size={14} class="settings-search-icon" />
            <Input
              class="input settings-search-input"
              type="search"
              value={query()}
              aria-label={tset("searchLabel")}
              placeholder={tset("searchPlaceholder")}
              autocomplete="off"
              onInput={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return
                const first = shown()[0]
                if (first) navigate(`/settings/${first.id}`)
              }}
            />
          </Box>
          <Box tag="nav" class="settings-nav" aria-label={tset("navLabel")}>
            <For each={groupSections(shown())}>
              {(g) => (
                <Box class="settings-nav-group">
                  <Text tag="h2" class="settings-nav-heading" id={`settings-group-${g.group}`}>
                    {tset(`group.${g.group}` as SettingsKey)}
                  </Text>
                  <Box tag="ul" class="settings-nav-list" aria-labelledby={`settings-group-${g.group}`}>
                    <For each={g.sections}>
                      {(s) => (
                        <Box tag="li">
                          <A class="settings-nav-link" href={`/settings/${s.id}`} activeClass="is-active" inactiveClass="">
                            <SettingsIcon name={s.icon} size={15} />
                            <Text tag="span">{tset(s.label)}</Text>
                          </A>
                        </Box>
                      )}
                    </For>
                  </Box>
                </Box>
              )}
            </For>
            <Show when={!shown().length}>
              <Text class="settings-card-sub settings-nav-empty" role="status">{tset("noResults", { query: query() })}</Text>
            </Show>
          </Box>
        </Box>
        <Box tag="main" class="settings-panel" aria-labelledby="settings-section-title">
          <Show when={active()} keyed>
            {(s) => {
              const Section = sectionComponent(s)
              return (
                <>
                  <Box class="settings-panel-head">
                    <Text tag="h1" id="settings-section-title" class="settings-panel-title">{tset(s.label)}</Text>
                    <Text class="settings-card-sub">{tset(`${s.label}.lead` as SettingsKey)}</Text>
                  </Box>
                  <Suspense fallback={<Text class="muted">{t("common.loading")}</Text>}>
                    <Section ctx={ctx()} onConnChange={setConn} />
                  </Suspense>
                </>
              )
            }}
          </Show>
        </Box>
      </Box>
    </Box>
  )
}
