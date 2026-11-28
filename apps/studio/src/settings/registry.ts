import type { Component } from "solid-js"
import type { DesktopConnection, HostCapabilities } from "@buildy/agent-contract"
import type { SettingsIconName } from "../app-icons/settings-icons"
import type { SettingsKey } from "../i18n/settings"

/**
 * The Settings section registry (ADR 0007). A section is data: an id (its URL segment, /settings/<id>), a group, its
 * words from the settings dictionary, a Lucide icon, where its values live, when it shows, and a lazy component.
 * The page renders the left menu and the right panel from this list only, so a new feature adds one entry here
 * (and its component under sections/) and touches nothing else.
 */
export type SettingsGroup = "app" | "agent" | "system"
export const SETTINGS_GROUPS: readonly SettingsGroup[] = ["app", "agent", "system"]

/**
 * Where a section's values live. client: this window's localStorage (theme, skin, export trace); server: the host
 * seam's typed routes (agent-contract zod schemas, pinned host-seam.json, protocol negotiated at connect); desktop:
 * the desktop app's own routes (HOST_DESKTOP_ROUTES: the SSH connection, the OS keychain).
 */
export type SettingsStorage = "client" | "server" | "desktop"

/** What a section may depend on: the desktop app's connection (null in a plain browser) and the host's flags. */
export type SettingsContext = {
  conn: DesktopConnection | null
  caps: HostCapabilities | null
}

export type SettingsSectionProps = {
  ctx: SettingsContext
  onConnChange: (conn: DesktopConnection) => void
}

export type SettingsSection = {
  id: string
  group: SettingsGroup
  order: number
  icon: SettingsIconName
  /** Menu label and panel title; `${label}.lead` and `${label}.keywords` must exist (checked by the tests). */
  label: Extract<SettingsKey, `section.${string}`>
  storage: readonly SettingsStorage[]
  /** Hidden when false (a host capability, the desktop app). Absent: always shown. */
  visible?: (ctx: SettingsContext) => boolean
  load: () => Promise<{ default: Component<SettingsSectionProps> }>
}

const ID = /^[a-z][a-z0-9-]{0,31}$/

/** Checks a registry once: unique ids that fit a URL segment. Sorted by group, then order. */
export function defineSettingsSections(list: readonly SettingsSection[]): readonly SettingsSection[] {
  const seen = new Set<string>()
  for (const s of list) {
    if (!ID.test(s.id)) throw new Error(`settings section id ${JSON.stringify(s.id)}: lowercase letters, digits and dashes`)
    if (seen.has(s.id)) throw new Error(`settings section id ${s.id} is used twice`)
    seen.add(s.id)
  }
  return [...list].sort((a, b) => SETTINGS_GROUPS.indexOf(a.group) - SETTINGS_GROUPS.indexOf(b.group) || a.order - b.order)
}

export function visibleSections(list: readonly SettingsSection[], ctx: SettingsContext): SettingsSection[] {
  return list.filter((s) => s.visible?.(ctx) ?? true)
}

/** The section of a deep link (/settings/<id>); an unknown or hidden id falls back to the first visible one. */
export function resolveSection(list: readonly SettingsSection[], id: string | undefined): SettingsSection | undefined {
  return list.find((s) => s.id === id) ?? list[0]
}

/** Sections whose label, lead or keywords contain every word of the query (case- and ё-insensitive). */
export function searchSections(list: readonly SettingsSection[], query: string, text: (key: SettingsKey) => string): SettingsSection[] {
  const norm = (s: string) => s.toLowerCase().replaceAll("ё", "е")
  const words = norm(query).split(/\s+/).filter(Boolean)
  if (!words.length) return [...list]
  return list.filter((s) => {
    const hay = norm([s.label, `${s.label}.lead`, `${s.label}.keywords`].map((k) => text(k as SettingsKey)).join(" "))
    return words.every((w) => hay.includes(w))
  })
}

/** Groups in their order, each with its sections (empty groups left out). */
export function groupSections(list: readonly SettingsSection[]): { group: SettingsGroup; sections: SettingsSection[] }[] {
  return SETTINGS_GROUPS.map((group) => ({ group, sections: list.filter((s) => s.group === group) })).filter((g) => g.sections.length)
}
