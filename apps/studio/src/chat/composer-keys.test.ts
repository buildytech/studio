import { describe, expect, test } from "bun:test"
import { isSendKey } from "./composer-keys"

const key = (over: Partial<KeyboardEvent>) => ({ key: "Enter", shiftKey: false, isComposing: false, repeat: false, ...over })

describe("isSendKey", () => {
  test("sends on a plain Enter only", () => {
    expect(isSendKey(key({}))).toBe(true)
    expect(isSendKey(key({ shiftKey: true }))).toBe(false)
    expect(isSendKey(key({ isComposing: true }))).toBe(false)
    expect(isSendKey(key({ repeat: true }))).toBe(false)
    expect(isSendKey(key({ key: "a" }))).toBe(false)
  })
})
