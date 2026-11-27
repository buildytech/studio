/** Icon zone of the start screen's theme switch: Sun and Moon only (the shell's eager bundle). */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import { Moon, Sun, type IconNode } from "lucide"
import { Icon as Frame } from "../kit/ui/icon/icon.solid"

const GLYPHS = { moon: Moon, sun: Sun } satisfies Record<string, IconNode>

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
