/**
 * Icon zone of the setup wizard (lazy chunk with ServerSetup): the Lucide glyphs it uses, imported one by one.
 * Drawn inside the kit's LucideIcon frame like AppIcon; decorative unless `label` is set.
 */
import { For, type JSX } from "solid-js"
import { Dynamic } from "solid-js/web"
import {
  ArrowRight, Box, Cable, Check, CircleCheck, CircleDashed, CircleX, Container, Globe, HardDrive, Info, KeyRound, Laptop,
  List, ListChecks, LoaderCircle, Lock, Network, Package, PartyPopper, Power, RefreshCw, Rocket, RotateCcw, Server, Shield,
  ShieldCheck, SlidersHorizontal, Sparkles, Stethoscope, Terminal, Timer, TriangleAlert, type IconNode,
} from "lucide"
import { LucideIcon as Frame } from "../compose"

const GLYPHS = {
  "arrow-right": ArrowRight,
  box: Box,
  cable: Cable,
  check: Check,
  "circle-check": CircleCheck,
  "circle-dashed": CircleDashed,
  "circle-x": CircleX,
  container: Container,
  globe: Globe,
  "hard-drive": HardDrive,
  info: Info,
  "key-round": KeyRound,
  laptop: Laptop,
  list: List,
  "list-checks": ListChecks,
  "loader-circle": LoaderCircle,
  lock: Lock,
  network: Network,
  package: Package,
  "party-popper": PartyPopper,
  power: Power,
  "refresh-cw": RefreshCw,
  rocket: Rocket,
  "rotate-ccw": RotateCcw,
  server: Server,
  shield: Shield,
  "shield-check": ShieldCheck,
  "sliders-horizontal": SlidersHorizontal,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  terminal: Terminal,
  timer: Timer,
  "triangle-alert": TriangleAlert,
} satisfies Record<string, IconNode>

export type SetupIconName = keyof typeof GLYPHS

export function SetupIcon(props: { name: SetupIconName; size?: number; label?: string; class?: string }): JSX.Element {
  return (
    <Frame label={props.label} class={props.class} data-icon={props.name}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={props.size ?? 16} height={props.size ?? 16} fill="none"
        stroke="currentColor" stroke-width={2} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <For each={GLYPHS[props.name]}>{([tag, attrs]) => <Dynamic component={tag} {...attrs} />}</For>
      </svg>
    </Frame>
  )
}
