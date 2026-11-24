/**
 * Icon zone: the Lucide glyphs the Studio uses, imported one by one so the bundle carries only these (the kit's
 * icons/LucideIcon imports every glyph). Drawn inside the kit's LucideIcon frame; decorative unless `label` is set.
 * rules:check allows <svg> only here.
 */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Ellipsis, type IconNode } from "lucide"
import { LucideIcon as Frame } from "../compose"

const GLYPHS = {
  ellipsis: Ellipsis,
} satisfies Record<string, IconNode>

export type IconName = keyof typeof GLYPHS

export function AppIcon(props: { name: IconName; size?: number; label?: string; class?: string }): JSX.Element {
  return (
    <Frame label={props.label} class={props.class} data-icon={props.name}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={props.size ?? 16}
        height={props.size ?? 16}
        fill="none"
        stroke="currentColor"
        stroke-width={2}
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <For each={GLYPHS[props.name]}>{([tag, attrs]) => <Dynamic component={tag} {...attrs} />}</For>
      </svg>
    </Frame>
  )
}
