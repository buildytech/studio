# ADR 0007: Settings as a section registry; Light / Dark / System and app skins

Status: accepted (2026-11-28)

## Context

- Settings was one long page of cards (`Settings.tsx`): the server connection, its help, the Cursor key and the chat
  export toggle, all eager in the entry bundle. Every new feature meant another card on the same page.
- The Studio was dark-only: `styles/studio-theme.css` set dark values on `:root`. Light values existed only for the
  desktop start screen (`styles/shell-skin.css`, `buildy-shell-theme` in localStorage, a toggle in the corner). The
  working window had no theme switch and no skins.
- BuildY chat already keeps Brand Skins with a light and a dark set of shadcn tokens (its ADR 0072) and a
  system / dark / light preference for its own UI (its ADR 0026).
- The desktop menu item File → Settings called `SetURL("/settings")`. Wails resolves that against the app's own
  origin, not the server's: a connected window landed on the start screen, which showed «Connected. Opening the
  server's Studio…» and waited for a navigation that never came. Only Quit got out.

## Decision

### Settings: one page, a registry of sections

- `/settings/:section?` is one lazy route (`settings/SettingsPage.tsx`, its own chunk with its dictionary
  `i18n/settings.{en,ru}.json`, its icons `app-icons/settings-icons.tsx` and `settings/settings.css`). Left: a search
  box and the section menu (`nav` with `aria-label`, a heading per group, links with `aria-current="page"`). Right:
  `main` with the section's `h1`, lead and component. `/settings` and an unknown id redirect to the first visible
  section, so every section has a deep link (`/settings/models` from the chat banner, `/settings/appearance`…).
- A section is data (`settings/registry.ts`, list in `settings/sections.ts`): `id` (URL segment), `group`
  (app / agent / system), `order`, `icon` (Lucide), `label` (`section.<id>`; `.lead` and `.keywords` beside it, EN and
  RU, checked by the tests), `storage`, an optional `visible(ctx)` (desktop connection, host capabilities) and a lazy
  `load()`. The page renders only from the registry; search matches label, lead and keywords of the active language.
- **Adding a section**: write `sections/<Name>.tsx` (default export, `SettingsSectionProps`), add `section.<id>`,
  `.lead`, `.keywords` to both settings dictionaries, its glyph to `settings-icons.tsx` if new, and one entry in
  `sections.ts`. Nothing else changes.
- Where values live (`storage`): **client** — this window's localStorage (theme, skin, export trace); **server** —
  the host seam's typed routes (zod schemas in `@buildy/agent-contract`, `host-seam.json` pinned by the hosts, the
  protocol / minClientProtocol pair negotiated at connect: that is the schema version); **desktop** — the desktop
  app's own routes (`HOST_DESKTOP_ROUTES`: the SSH connection, the OS keychain). A new server setting is a new seam
  route with its schema, never a free-form key-value store.
- Starting sections, the old page moved, nothing duplicated: General (chat export), Appearance (theme, skin), Models
  and keys (provider key slots, Cursor first), Account (the Cursor account, read-only), Server (the connection card
  and the server help of the start screen; in a plain browser, where the Studio comes from), About (app, server,
  seam, protocol, releases).

### Theme: Light / Dark / System

- The `dark` class on `<html>` (the kit's custom variant). `styles/studio-theme.css` keeps the dark values on `:root`
  and now carries the light values on `html:not(.dark)` for the whole Studio (formerly the start screen's only;
  `shell-skin.css` is gone). Text pairs are WCAG AA in both modes (`presets/skins.test.ts`). The code editor's syntax
  colours are tokens too (`vendor-ui/codemirror/syntax.css`, a dark and a light set, AA, in the editor chunk).
- The choice is a client setting: `vibechat.theme` = `light` | `dark` | `system` in localStorage (`theme/prefs.ts`).
  Absent: the start screen's old `buildy-shell-theme`, else `dark` (the Studio was dark-only; nobody's window changes
  by itself). System follows `prefers-color-scheme` live; another window's change follows through `storage` events.
- No flash: a tiny inline script in `index.html` and `shell.html` reads the same keys and sets the class (and the
  skin) before the stylesheet paints; a test keeps the keys equal.
- Quick switch: Light / Dark / System as `menuitemradio` items in the working window's account menu. The start
  screen keeps its corner toggle on the same preference. Settings → Appearance has the same choice.

### Skins

- An app skin is JSON of the format `vibechat-skin`, version 1 (`presets/skins.ts`): `id`, `name`, `light` and
  `dark` token maps. Token names are the kit's shadcn names (`background`, `primary`, `muted-foreground`, …) plus the
  Studio aliases (`bg-elevated`, `link`, …); values are `#rrggbb` only, so an imported skin cannot inject CSS
  (`parseSkin`). A token a skin leaves out keeps the stylesheet's value.
- Built in: Ember (the default: the stylesheet itself, no tokens), Graphite (neutral), Ocean (blue). Each keeps AA in
  both modes (tested). The chosen skin is a client setting: its id on `<html data-skin>`, its generated CSS in
  `<style id="vibechat-skin">`, both cached (`vibechat.skin`, `vibechat.skin.css`) so the boot script restores them
  before the first paint; the catalogue itself loads with Settings only.
- BuildY chat compatibility: a Brand Skin's palette writes the same shadcn token names for light and dark
  (`paletteStyle(palette, mode)`). Importing one is a later step: resolve its tokens for both modes into a
  `vibechat-skin` and pass `parseSkin`; the format needs no change for it.

### File → Settings in the desktop app

- The menu asks the connection manager to open a route (`Manager.Open`): connected, it buys a fresh one-time ticket
  and moves the window to `/auth/session?ticket=…&next=/settings` on the server's origin (the server sends it on to
  `next`, a same-origin path only); not connected, it shows the start screen, which is the connection settings.
- The start screen never dead-ends: when «Connected. Opening the server's Studio…» stays for 10 s it offers Try again
  (reconnect to the saved server) and Back (disconnect to the choice).

### Budget

- SLO 2 (entry CSS) goes from 16 000 to 16 500 B gz: the light token set for the whole Studio costs about 600 B; the
  syntax colours, the editor's empty state and the Settings styles stay out of the entry. The entry JS went down
  (Settings left it).

## Consequences

- A feature with settings adds a registry entry, not a card on a shared page; its deep link and search come free.
- Every surface reads tokens, so a skin or the light mode reaches the whole window; a literal colour in a component
  stays a rules:check finding.
- The start screen (app origin) and the server's Studio (127.0.0.1 origin) keep separate localStorage: the theme is
  chosen per origin. Sharing it would need the desktop route; not needed yet.
