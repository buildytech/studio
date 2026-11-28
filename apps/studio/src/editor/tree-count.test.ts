import { expect, test } from "bun:test"
import { countTreeFiles } from "./tree-count"

test("folders do not count, nested files do", () => {
  expect(countTreeFiles([])).toBe(0)
  expect(countTreeFiles([{ name: "src", path: "src", type: "dir", children: [] }] as never)).toBe(0)
  expect(countTreeFiles([{ name: "src", path: "src", type: "dir", children: [{ name: "a.go", path: "src/a.go", type: "file" }] }, { name: "go.mod", path: "go.mod", type: "file" }] as never)).toBe(2)
})
