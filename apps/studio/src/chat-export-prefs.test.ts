import { describe, expect, test } from "bun:test"
import {
  ensureExportIncludeTraceDefault,
  readExportIncludeTrace,
  writeExportIncludeTrace,
} from "./chat-export-prefs"

describe("chat-export-prefs", () => {
  test("defaults on and round-trips", () => {
    const store = new Map<string, string>()
    const ls = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    }
    Object.defineProperty(globalThis, "localStorage", {
      value: ls,
      configurable: true,
    })

    store.clear()
    expect(readExportIncludeTrace()).toBe(true)
    writeExportIncludeTrace(false)
    expect(readExportIncludeTrace()).toBe(false)
    expect(ensureExportIncludeTraceDefault()).toBe(true)
    expect(store.get("buildy.exportIncludeTrace")).toBe("1")
    expect(readExportIncludeTrace()).toBe(true)
  })
})
