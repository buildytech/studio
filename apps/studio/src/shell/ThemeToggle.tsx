import { createSignal, type JSX } from "solid-js"
import { ThemeIcon } from "../app-icons/theme-icons"
import { t } from "../i18n"
import { Button } from "../primitives"
import { applyTheme, storedTheme, type Theme } from "./theme"

/**
 * The start screen's theme switch (bottom right): the `dark` class on <html>, the same tokens in both (the light
 * values in styles/shell-skin.css); the state reaches ARIA only through the Button's `pressed` prop.
 */
export function ThemeToggle(): JSX.Element {
  const [theme, setTheme] = createSignal<Theme>(storedTheme())
  applyTheme(theme())
  const flip = () => {
    const next: Theme = theme() === "dark" ? "light" : "dark"
    setTheme(next)
    applyTheme(next, true)
  }
  return (
    <Button class="shell-theme-toggle" type="button" pressed={theme() === "dark"} aria-label={t("shell.themeDark")} onClick={flip}>
      <ThemeIcon name={theme() === "dark" ? "moon" : "sun"} />
    </Button>
  )
}
