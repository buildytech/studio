import { describe, expect, test } from "bun:test"
import dictionary from "./ui.en.json"
import { t } from "./index"

describe("dictionary", () => {
  test("DictionaryV04 shape: a locale and non-empty string messages", () => {
    expect(dictionary.locale).toBe("en")
    for (const [key, value] of Object.entries(dictionary.messages)) {
      expect(typeof value, key).toBe("string")
      expect(value.trim().length, key).toBeGreaterThan(0)
    }
  })

  test("t fills placeholders and leaves unknown ones", () => {
    expect(t("projects.updated", { when: "2m ago" })).toBe("Updated 2m ago")
    expect(t("projects.updated")).toBe("Updated {when}")
  })
})

describe("help dictionary", () => {
  test("DictionaryV04 shape, EN — RU texts, placeholders the same on both sides", async () => {
    const help = (await import("./help.en.json")).default
    expect(help.locale).toBe("en")
    for (const [key, value] of Object.entries(help.messages)) {
      expect(typeof value, key).toBe("string")
      const [en, ru] = value.split(" — ")
      expect(ru?.trim().length ?? 0, key).toBeGreaterThan(0)
      const vars = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      expect(vars(ru!), key).toEqual(vars(en!))
    }
  })
})

describe("setup dictionary", () => {
  test("EN — RU, every step, state and problem of the contract has words", async () => {
    const setup = (await import("./setup.en.json")).default
    const { DESKTOP_PROVISION_STEPS, DesktopProvisionStepStateSchema, DesktopProvisionProblemCodeSchema } = await import("@buildy/agent-contract")
    const keys = [
      ...DESKTOP_PROVISION_STEPS.map((s) => `step.${s}`),
      ...DesktopProvisionStepStateSchema.options.map((s) => `state.${s}`),
      ...DesktopProvisionProblemCodeSchema.options.map((s) => `problem.${s}`),
    ]
    const messages = setup.messages as Record<string, string>
    for (const k of keys) expect(messages[k], k).toBeString()
    for (const [key, value] of Object.entries(messages)) expect(value.includes(" — "), key).toBe(true)
  })
})
