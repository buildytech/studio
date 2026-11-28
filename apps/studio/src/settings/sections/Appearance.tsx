import { For, Show, createSignal, type JSX } from "solid-js"
import { SettingsIcon, type SettingsIconName } from "../../app-icons/settings-icons"
import { cssVars } from "../../lib/css-vars"
import { t, type MessageKey } from "../../i18n"
import { tset, type SettingsKey } from "../../i18n/settings"
import { BUILTIN_SKINS, skinCss, swatchTokens, type AppSkin } from "../../presets/skins"
import { Box, Label, Radio, Text } from "../../primitives"
import { setThemePref, themeMode, themePref, type ThemePref } from "../../theme/prefs"
import { applySkinCss, readSkinId } from "../../theme/skin"

const THEMES: { id: ThemePref; label: MessageKey; icon: SettingsIconName }[] = [
  { id: "light", label: "theme.light", icon: "sun" },
  { id: "dark", label: "theme.dark", icon: "moon" },
  { id: "system", label: "theme.system", icon: "monitor" },
]

/** Swatch colours of a skin in the current mode, as custom properties (no inline style attribute). */
function swatch(skin: AppSkin, el: HTMLElement): void {
  cssVars(el, () => {
    const s = swatchTokens(skin, themeMode())
    return {
      "--sw-bg": s.background ?? "",
      "--sw-card": s.card ?? "",
      "--sw-fg": s.foreground ?? "",
      "--sw-muted": s["muted-foreground"] ?? "",
      "--sw-primary": s.primary ?? "",
      "--sw-border": s.border ?? "",
    }
  })
}

/**
 * Appearance (client): Light / Dark / System and the app skin, both in this window's localStorage (ADR 0007).
 * Two radio groups (fieldset + legend), native inputs inside their labels.
 */
export default function Appearance(): JSX.Element {
  const [skinId, setSkinId] = createSignal(readSkinId())
  const choose = (skin: AppSkin) => {
    applySkinCss(skin.id, skinCss(skin))
    setSkinId(skin.id)
  }
  return (
    <Box class="settings-cards">
      <Box tag="section" class="settings-card">
        <Box tag="fieldset" class="settings-fieldset">
          <Text tag="legend" class="settings-card-title">{t("theme.label")}</Text>
          <Text class="settings-card-sub">{tset("appearance.themeLead")}</Text>
          <Box class="settings-choices settings-choices-3">
            <For each={THEMES}>
              {(item) => (
                <Label class="settings-choice" classList={{ "is-checked": themePref() === item.id }}>
                  <Radio class="sr-only" name="settings-theme" value={item.id} checked={themePref() === item.id} onChange={() => setThemePref(item.id)} />
                  <SettingsIcon name={item.icon} size={18} />
                  <Text tag="span" class="settings-choice-label">{t(item.label)}</Text>
                </Label>
              )}
            </For>
          </Box>
        </Box>
      </Box>
      <Box tag="section" class="settings-card">
        <Box tag="fieldset" class="settings-fieldset">
          <Text tag="legend" class="settings-card-title">{tset("appearance.skin")}</Text>
          <Text class="settings-card-sub">{tset("appearance.skinLead")}</Text>
          <Box class="settings-choices settings-choices-skins">
            <For each={BUILTIN_SKINS}>
              {(skin, i) => (
                <Label class="settings-choice settings-skin" classList={{ "is-checked": skinId() === skin.id }}>
                  <Radio class="sr-only" name="settings-skin" value={skin.id} checked={skinId() === skin.id} onChange={() => choose(skin)} />
                  <Box class="settings-skin-swatch" aria-hidden="true" ref={(el) => swatch(skin, el)}>
                    <Box class="settings-skin-bar" />
                    <Box class="settings-skin-line" />
                    <Box class="settings-skin-line is-short" />
                    <Box class="settings-skin-dot" />
                  </Box>
                  <Box class="settings-skin-meta">
                    <Text tag="span" class="settings-choice-label">{tset(`skin.${skin.id}` as SettingsKey)}</Text>
                    <Show when={i() === 0}>
                      <Text tag="span" class="settings-choice-hint">{tset("appearance.default")}</Text>
                    </Show>
                  </Box>
                  <Show when={skinId() === skin.id}>
                    <SettingsIcon name="check" size={14} class="settings-skin-check" />
                  </Show>
                </Label>
              )}
            </For>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
