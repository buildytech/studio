import { describe, expect, test } from "bun:test"
import {
  clampTreePct,
  DEFAULT_TREE_PCT,
  MAX_TREE_PCT,
  MIN_TREE_PCT,
  persistTreeOpen,
  readTreeOpen,
  treePctFromPointer,
} from "./tree-split"

describe("editor tree-split", () => {
  test("clampTreePct bounds width", () => {
    expect(clampTreePct(5)).toBe(MIN_TREE_PCT)
    expect(clampTreePct(90)).toBe(MAX_TREE_PCT)
    expect(clampTreePct(18)).toBe(18)
    expect(clampTreePct(Number.NaN)).toBe(DEFAULT_TREE_PCT)
  })

  test("treePctFromPointer measures from the left edge", () => {
    const rect = { left: 100, width: 1000 }
    expect(treePctFromPointer(280, rect)).toBe(18)
    expect(treePctFromPointer(2000, rect)).toBe(MAX_TREE_PCT)
  })

  test("tree open defaults on and round-trips", () => {
    const store = new Map<string, string>()
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => {
          store.set(k, v)
        },
      },
      configurable: true,
    })
    store.clear()
    expect(readTreeOpen()).toBe(true)
    persistTreeOpen(false)
    expect(readTreeOpen()).toBe(false)
    persistTreeOpen(true)
    expect(readTreeOpen()).toBe(true)
  })
})
