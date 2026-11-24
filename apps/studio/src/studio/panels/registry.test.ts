import { describe, expect, test } from "bun:test"
import {
  STUDIO_PANEL_CONTRACT_VERSION,
  parseStudioPanelSchemas,
} from "@buildy/studio-panel-contract"
import {
  mountedPanelIdsAfterActivation,
  shouldRenderPanel,
} from "./mount-state"
import {
  persistActivePanelId,
  readActivePanelId,
  readLastPanelId,
} from "./persistence"
import {
  defaultStudioPanelId,
  resolveStudioPanels,
} from "./registry"

const schemas = parseStudioPanelSchemas([
  {
    schemaVersion: STUDIO_PANEL_CONTRACT_VERSION,
    id: "code",
    label: "Editor",
    provider: "code",
    order: 10,
    mount: "lazy-once",
  },
  {
    schemaVersion: STUDIO_PANEL_CONTRACT_VERSION,
    id: "preview",
    label: "Preview",
    provider: "preview",
    order: 20,
    default: true,
    mount: "always",
  },
])

const providers = [
  { id: "code", load: async () => ({ default: () => null }) },
  { id: "preview", load: async () => ({ default: () => null }) },
]

function memoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial))
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
  }
}

describe("Studio panel registry", () => {
  test("resolves trusted providers and the declared default", () => {
    const resolved = resolveStudioPanels(schemas, providers)
    expect(resolved.map((panel) => panel.schema.id)).toEqual(["code", "preview"])
    expect(defaultStudioPanelId(resolved)).toBe("preview")
  })

  test("rejects missing and duplicate providers", () => {
    expect(() => resolveStudioPanels(schemas, providers.slice(0, 1))).toThrow(
      /missing provider "preview"/,
    )
    expect(() =>
      resolveStudioPanels(schemas, [providers[0], providers[0]])
    ).toThrow(/duplicate Studio panel provider/)
  })
})

describe("Studio panel mount policy", () => {
  test("keeps Preview mounted while Code becomes active", () => {
    const first = mountedPanelIdsAfterActivation(schemas, "preview")
    const switched = mountedPanelIdsAfterActivation(schemas, "code", first)
    expect([...switched].sort()).toEqual(["code", "preview"])
    expect(shouldRenderPanel(schemas[1], "code", switched)).toBe(true)
  })
})

describe("Studio panel persistence", () => {
  test("migrates the previous editor id to code", () => {
    const storage = memoryStorage({ "buildy.studioRightPane": "editor" })
    expect(readActivePanelId(["code", "preview"], "preview", storage)).toBe("code")
  })

  test("remembers the last panel while collapsed", () => {
    const storage = memoryStorage()
    persistActivePanelId("code", storage)
    persistActivePanelId(null, storage)
    expect(readActivePanelId(["code", "preview"], "preview", storage)).toBeNull()
    expect(readLastPanelId(["code", "preview"], "preview", storage)).toBe("code")
  })
})

