import { describe, expect, test } from "bun:test"
import { looksPastedTwice, pastedKey } from "./key-input"

describe("API key field", () => {
  const key = "grok_" + "a1".repeat(48) + "2a6"
  test("a key pasted twice is detected", () => {
    expect(looksPastedTwice(key + key)).toBe(true)
    expect(looksPastedTwice(` ${key}${key}\n`)).toBe(true)
  })
  test("a normal key is not", () => {
    expect(looksPastedTwice(key)).toBe(false)
    expect(looksPastedTwice("abab")).toBe(false)
    expect(looksPastedTwice(key + key.slice(0, -1) + "x")).toBe(false)
  })
  test("a paste replaces the field", () => {
    expect(pastedKey(`  ${key}\r\n`)).toBe(key)
  })
})
