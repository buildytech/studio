import { expect, test } from "bun:test"
import { render } from "solid-js/web"
import { createSignal } from "solid-js"
import { Box } from "../src/primitives"

test("solid renders in happy-dom", () => {
  const host = document.createElement("div")
  const [n, setN] = createSignal(1)
  render(() => <Box role="status">{n()}</Box>, host)
  expect(host.querySelector('[role="status"]')?.textContent).toBe("1")
  setN(2)
  expect(host.textContent).toBe("2")
})
