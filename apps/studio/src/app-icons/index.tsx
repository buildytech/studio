/**
 * Icon zone: the Lucide glyphs the Studio uses, imported one by one so the bundle carries only these (the kit's
 * icons/LucideIcon imports every glyph). Drawn inside the kit's LucideIcon frame; decorative unless `label` is set.
 * rules:check allows <svg> only here.
 */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import { ChevronDown, Download, FilePen, FileText, LoaderCircle, Monitor, Search, Terminal, Wrench, ChevronLeft, ChevronRight, Ellipsis, ExternalLink, PanelLeftClose, PanelLeftOpen, Play, RotateCw, Paperclip, Plus, Square, Upload, X, type IconNode } from "lucide"
import { LucideIcon as Frame } from "../compose"

const GLYPHS = {
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  download: Download,
  loader: LoaderCircle,
  upload: Upload,
  ellipsis: Ellipsis,
  "external-link": ExternalLink,
  "file-pen": FilePen,
  "file-text": FileText,
  monitor: Monitor,
  "panel-left-close": PanelLeftClose,
  "panel-left-open": PanelLeftOpen,
  paperclip: Paperclip,
  play: Play,
  plus: Plus,
  refresh: RotateCw,
  search: Search,
  stop: Square,
  terminal: Terminal,
  wrench: Wrench,
  x: X,
} satisfies Record<string, IconNode>

export type IconName = keyof typeof GLYPHS

/** `filled` paints the glyph (play and stop read better solid at 14–15 px). */
export function AppIcon(props: { name: IconName; size?: number; filled?: boolean; label?: string; class?: string }): JSX.Element {
  return (
    <Frame label={props.label} class={props.class} data-icon={props.name}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={props.size ?? 16}
        height={props.size ?? 16}
        fill={props.filled ? "currentColor" : "none"}
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
