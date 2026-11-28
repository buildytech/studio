/** Icon zone of the theme switches (start screen, account menu): Sun, Moon and Monitor only (both eager bundles). */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Monitor, Moon, Sun, type IconNode } from "lucide"
import { Icon as Frame } from "../kit/ui/icon/icon.solid"

const GLYPHS = { moon: Moon, sun: Sun, monitor: Monitor } satisfies Record<string, IconNode>

export type ThemeIconName = keyof typeof GLYPHS

export function ThemeIcon(props: { name: keyof typeof GLYPHS; size?: number; class?: string }): JSX.Element {
  return (
    <Frame class={props.class} data-icon={props.name}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} fill="none"
        stroke="currentColor" stroke-width={2} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <For each={GLYPHS[props.name]}>{([tag, attrs]) => <Dynamic component={tag} {...attrs} />}</For>
      </svg>
    </Frame>
  )
}
