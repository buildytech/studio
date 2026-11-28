import type { JSX } from "solid-js"
import { ThemeIcon } from "../app-icons/theme-icons"
import { t } from "../i18n"
import { Button } from "../primitives"
import { initTheme, setThemePref, themeMode } from "../theme/prefs"

/**
 * The start screen's theme switch (bottom right): the `dark` class on <html> and the same tokens as the Studio
 * (styles/studio-theme.css); the choice is the Studio's own (theme/prefs.ts, ADR 0007). The state reaches ARIA only
 * through the Button's `pressed` prop.
 */
export function ThemeToggle(): JSX.Element {
  initTheme()
  const flip = () => setThemePref(themeMode() === "dark" ? "light" : "dark")
  return (
    <Button class="shell-theme-toggle" type="button" pressed={themeMode() === "dark"} aria-label={t("shell.themeDark")} onClick={flip}>
      <ThemeIcon name={themeMode() === "dark" ? "moon" : "sun"} />
    </Button>
  )
}
