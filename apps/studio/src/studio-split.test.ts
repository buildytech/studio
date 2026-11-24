import { describe, expect, test } from "bun:test"
import {
  clampSidePct,
  DEFAULT_SIDE_PCT,
  MAX_SIDE_PCT,
  MIN_SIDE_PCT,
  sidePctFromPointer,
} from "./studio-split"

describe("studio-split", () => {
  test("clampSidePct bounds width", () => {
    expect(clampSidePct(10)).toBe(MIN_SIDE_PCT)
    expect(clampSidePct(90)).toBe(MAX_SIDE_PCT)
    expect(clampSidePct(40)).toBe(40)
    expect(clampSidePct(Number.NaN)).toBe(DEFAULT_SIDE_PCT)
  })

  test("sidePctFromPointer measures from the right edge", () => {
    const rect = { left: 100, width: 1000 }
    // Pointer at x=700 → 400px from right → 40%
    expect(sidePctFromPointer(700, rect)).toBe(40)
    // Far left → clamps to max
    expect(sidePctFromPointer(0, rect)).toBe(MAX_SIDE_PCT)
  })
})
