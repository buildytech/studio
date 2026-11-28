/**
 * Icon zone of the Settings page (ADR 0007): the Lucide glyphs its section registry may name, imported one by one;
 * this module loads with the lazy Settings route only. A new section adds its glyph here.
 */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import { ArrowLeft, Bot, Check, Info, Monitor, Moon, Palette, Search, Server, SlidersHorizontal, Sun, User, type IconNode } from "lucide"
import { LucideIcon as Frame } from "../compose"

const GLYPHS = {
  "arrow-left": ArrowLeft,
  bot: Bot,
  check: Check,
  info: Info,
  monitor: Monitor,
  moon: Moon,
  palette: Palette,
  search: Search,
  server: Server,
  sliders: SlidersHorizontal,
  sun: Sun,
  user: User,
} satisfies Record<string, IconNode>

export type SettingsIconName = keyof typeof GLYPHS
export const SETTINGS_ICON_NAMES = Object.keys(GLYPHS) as SettingsIconName[]

export function SettingsIcon(props: { name: SettingsIconName; size?: number; class?: string }): JSX.Element {
  return (
    <Frame class={props.class} data-icon={props.name}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} fill="none"
        stroke="currentColor" stroke-width={2} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <For each={GLYPHS[props.name]}>{([tag, attrs]) => <Dynamic component={tag} {...attrs} />}</For>
      </svg>
    </Frame>
  )
}
