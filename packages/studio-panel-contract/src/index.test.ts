import { describe, expect, test } from "bun:test"
import {
  STUDIO_PANEL_CONTRACT_VERSION,
  StudioPanelSchema,
  parseStudioPanelSchemas,
} from "./index"

function panel(
  id: string,
  order = 0,
  isDefault = false,
): Record<string, unknown> {
  return {
    schemaVersion: STUDIO_PANEL_CONTRACT_VERSION,
    id,
    label: id,
    provider: id,
    order,
    default: isDefault,
    mount: "lazy-once",
  }
}

describe("StudioPanelSchema", () => {
  test("applies serializable defaults", () => {
    const parsed = StudioPanelSchema.parse(panel("code"))
    expect(parsed.toolbar).toBe("provider")
    expect(parsed.actions).toEqual([])
    expect(parsed.config).toEqual({})
  })

  test("rejects module URLs and unknown fields", () => {
    expect(() =>
      StudioPanelSchema.parse({
        ...panel("remote"),
        module: "https://plugins.example/panel.js",
      })
    ).toThrow()
  })
})

describe("parseStudioPanelSchemas", () => {
  test("orders panels deterministically", () => {
    expect(
      parseStudioPanelSchemas([
        panel("preview", 20, true),
        panel("code", 10),
      ]).map((item) => item.id)
    ).toEqual(["code", "preview"])
  })

  test("rejects duplicate ids and defaults", () => {
    expect(() => parseStudioPanelSchemas([panel("code"), panel("code")])).toThrow(
      /duplicate/,
    )
    expect(() =>
      parseStudioPanelSchemas([
        panel("code", 10, true),
        panel("preview", 20, true),
      ])
    ).toThrow(/at most one default/)
  })
})

