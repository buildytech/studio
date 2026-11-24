/**
 * Studio Panel Contract v1 — serializable control-plane descriptors only.
 *
 * A schema may select a trusted provider by id, but it can never name a module,
 * URL, script, or callback. Solid implementations belong to the web registry.
 */

import { z } from "zod"

export const STUDIO_PANEL_CONTRACT_VERSION = "buildy.studio-panel.v1" as const

const PanelIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/, "must be lowercase kebab-case")

export const PanelMountPolicySchema = z.enum([
  "always",
  "lazy-once",
  "visible-only",
])
export type PanelMountPolicy = z.infer<typeof PanelMountPolicySchema>

export const PanelToolbarModeSchema = z.enum(["provider", "none"])
export type PanelToolbarMode = z.infer<typeof PanelToolbarModeSchema>

export const StudioPanelActionSchema = z.strictObject({
  id: PanelIdSchema,
  label: z.string().min(1).max(80),
  icon: z.string().min(1).max(80).optional(),
})
export type StudioPanelAction = z.infer<typeof StudioPanelActionSchema>

export const StudioPanelSchema = z.strictObject({
  schemaVersion: z.literal(STUDIO_PANEL_CONTRACT_VERSION),
  id: PanelIdSchema,
  label: z.string().min(1).max(80),
  provider: PanelIdSchema,
  order: z.number().int().default(0),
  icon: z.string().min(1).max(80).optional(),
  default: z.boolean().default(false),
  mount: PanelMountPolicySchema,
  toolbar: PanelToolbarModeSchema.default("provider"),
  actions: z.array(StudioPanelActionSchema).default([]),
  config: z.record(z.string(), z.unknown()).default({}),
})
export type StudioPanel = z.infer<typeof StudioPanelSchema>

/**
 * Parse, de-duplicate, and deterministically order a panel collection.
 * Provider existence is checked by the renderer registry, not by this package.
 */
export function parseStudioPanelSchemas(input: readonly unknown[]): StudioPanel[] {
  const panels = input.map((value) => StudioPanelSchema.parse(value))
  const ids = new Set<string>()
  let defaultCount = 0
  for (const panel of panels) {
    if (ids.has(panel.id)) throw new Error(`duplicate Studio panel id "${panel.id}"`)
    ids.add(panel.id)
    if (panel.default) defaultCount += 1
  }
  if (defaultCount > 1) {
    throw new Error("Studio panel collection may have at most one default")
  }
  return [...panels].sort((left, right) =>
    left.order === right.order
      ? left.id.localeCompare(right.id)
      : left.order - right.order
  )
}

