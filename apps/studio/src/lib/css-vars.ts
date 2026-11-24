import { createRenderEffect } from "solid-js"

/**
 * Binds CSS custom properties to an element (contract: no inline style attribute; layout reads the variable from
 * the stylesheet). Call from a ref: ref={(el) => cssVars(el, () => ({ "--x": `${pct()}%` }))}.
 */
export function cssVars(el: HTMLElement, vars: () => Record<`--${string}`, string>): void {
  createRenderEffect(() => {
    for (const [name, value] of Object.entries(vars())) el.style.setProperty(name, value)
  })
}
