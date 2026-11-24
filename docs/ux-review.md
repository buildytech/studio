# UX and art-direction review — Studio before the UI8Kit refactor

Reviewed on `5e41766` in the installed desktop app (Linux, 1800×1080 window, dark). Screens: Projects, Studio (chat +
preview), Settings; a long agent run from the t148u exam (31–44 tool calls per run). Screenshots, one view, dark:
`before-projects-dark.png`, `before-studio-dark.png`, `before-settings-dark.png` (owner's box,
`/workspace/buildy-chat-shots/t151u/`). Numbers come from the code (`rg`/scripts) unless marked.

Principle: fix what blocks reading, acting and trusting; leave taste alone (KISS). Each finding has a decision.

## 1. Hierarchy and density

| Finding | Evidence | Decision |
| --- | --- | --- |
| The Studio bar shows **Remix** and **Publish** that are always disabled («Coming soon»). | `Studio.tsx` 244–259 | Remove them; nothing is shown that cannot be done. |
| Tool calls take one row each: a run is a column of «FILE read … done» pills; the answer is pushed below the fold. | exam runs: 31, 33, 44 tool calls | Group consecutive finished calls of one kind into one row with a count; expand on demand (ADR 0005). |
| Thinking text is small monospace in muted grey and reads like logs. | `styles.css` thinking rules, `--muted-foreground #707070` | Body font, muted token with AA contrast, collapsed by default after the run with its duration. |
| Usage «688k ↔ 13k» next to Ready is cryptic. | chat toolbar | Label it («in 688k · out 13k»), full breakdown in the title (kept). |
| The Settings screen leads with «Chat export» (a developer option) and its copy names a removed agent («Cursor and Pi»), «encrypted at rest» (the desktop keeps keys in the OS keychain). | `Settings.tsx` | Cursor key first; copy says what the host does (from the dictionary, host-neutral). |

## 2. States: loading, empty, error, offline

| Finding | Decision |
| --- | --- |
| Preview stopped: centred sentence, the only action is a 24 px icon in the toolbar. | Empty state with one primary «Start preview» button; the toolbar keeps the icon. |
| Loading is a bare «Loading…» text in the bar. | `Skeleton`-like muted blocks only where content appears (project title, list); no spinners elsewhere. |
| Errors: a banner (`role="alert"`) for chat errors exists; preview and file errors print raw messages. | One `Notice` composition (title, message, action) for error / offline / capability-off, used by all panels. |
| Offline / host gone: SSE errors fall back silently. | When `/host/capabilities` fails the Studio shows a host-offline notice with Retry; the chat keeps the draft. |
| Projects list without projects shows only the creation row. | Empty state: one sentence and the input focused. |

## 3. Composer

| Finding | Decision |
| --- | --- |
| Send and Stop exist; a second prompt during a run is blocked (no queue). | Keep it: one run at a time is the host's model (the bridge runs one agent per chat). Show «Stop» as the primary action while running; Enter while running does nothing and says why (hint text). No queue — KISS. |
| Esc does not stop a run. | Esc in the composer = Stop when running (with the same confirm-free behaviour as the button). |
| Attachments chip has `aria-live`, the run status has none. | One `aria-live="polite"` region for run status (ADR 0005 §6). |

## 4. Keyboard and focus

- 13 `onKeyDown` handlers, no shared shortcut map. Decision: a small `shortcuts.ts` (Enter send, Shift+Enter
  newline, Esc stop / close menu, Ctrl/Cmd+K focus composer); menus and dialogs return focus to their trigger
  (contract rule 02.4).
- Custom buttons are bare `<button>`/`<div>` with classes (51 bare buttons): the kit `Button` gives one focus ring.

## 5. Consistency of panels

- Editor and Preview share the side panel but have different toolbars (route input + 3 icon buttons vs tree toggle).
  Decision: one `PanelToolbar` (title, start slot, end actions) composed from `Group` + `Button size="icon"`.
- Inline SVG icons in three files (7 `svg`): replace with Lucide through the kit `Icon`.

## 6. Typography and tokens

| Finding | Evidence | Decision |
| --- | --- | --- |
| 29 distinct `font-size` values (10 px to 2.25 rem). | `styles.css`, 107 declarations | Six-step scale tokens: `--text-xs 11px`, `--text-sm 12px`, `--text-base 14px`, `--text-md 16px`, `--text-lg 20px`, `--text-xl 28px`. |
| Muted text `#707070` on `#080808` is 4.04:1, on cards `#161616` 3.65:1 (below WCAG AA 4.5:1 for small text). | computed | `--muted-foreground` raised so muted text on cards passes 4.5:1. |
| 103 hard-coded colors outside the token block. | `styles.css` | Every color is a token in `tokens.css`; components use token utilities only. |
| 222 app-only CSS classes for layout. | ui8px extract | Tailwind utilities on primitives; the remaining brand look lives in token values, not classes. |

## 7. Tool-call streaming (summary of ADR 0005)

One normalized `ToolCall` model and reducer (started / delta / finished / cancel), a composite view
(`Root / Header / Status / Body / Actions`) made of primitives, a registry of renderers per kind (shell, edit, read,
search, preview, fallback) — a new tool is a new entry — grouping of consecutive calls, bounded output and render
window, and one polite live region. Tests run on JSON fixtures of real streams.

## Out of scope (kept as is)

The dark palette and the accent `#fab283`, the split layout chat | side panel, the markdown look (ADR 0004).
