import { HighlightStyle, syntaxHighlighting } from "@codemirror/language"
import { EditorView } from "@codemirror/view"
import { tags as t } from "@lezer/highlight"

/** Editor chrome aligned with Studio dark tokens (no purple UI chrome). */
export const studioEditorTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      fontSize: "0.78rem",
      backgroundColor: "var(--bg)",
      color: "var(--text)",
    },
    ".cm-scroller": {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      lineHeight: "1.45",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
      padding: "0.5rem 0",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "rgba(250, 178, 131, 0.22) !important",
      },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    ".cm-gutters": {
      backgroundColor: "var(--bg-elevated)",
      color: "var(--muted)",
      border: "none",
      borderRight: "1px solid var(--border)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.04)",
    },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--panel-muted)",
      border: "none",
      color: "var(--muted)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--panel)",
      border: "1px solid var(--border)",
      color: "var(--text)",
    },
  },
  { dark: true },
)

/** Warm syntax palette that sits on Studio’s charcoal + accent. */
const studioHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "#fab283" },
  { tag: t.operator, color: "#c8c8c8" },
  { tag: t.special(t.variableName), color: "#ffc09a" },
  { tag: t.typeName, color: "#e9c46a" },
  { tag: t.className, color: "#e9c46a" },
  { tag: t.propertyName, color: "#9ecbff" },
  { tag: t.variableName, color: "#d6d6d6" },
  { tag: t.definition(t.variableName), color: "#d6d6d6" },
  { tag: t.function(t.variableName), color: "#82aaff" },
  { tag: t.string, color: "#c3e88d" },
  { tag: t.special(t.string), color: "#c3e88d" },
  { tag: t.number, color: "#f78c6c" },
  { tag: t.bool, color: "#f78c6c" },
  { tag: t.null, color: "#f78c6c" },
  { tag: t.comment, color: "#6a6a6a", fontStyle: "italic" },
  { tag: t.meta, color: "#8a8a8a" },
  { tag: t.tagName, color: "#fab283" },
  { tag: t.attributeName, color: "#e9c46a" },
  { tag: t.attributeValue, color: "#c3e88d" },
  { tag: t.heading, color: "#ffc09a", fontWeight: "bold" },
  { tag: t.link, color: "#82aaff" },
  { tag: t.url, color: "#82aaff" },
  { tag: t.emphasis, fontStyle: "italic" },
  { tag: t.strong, fontWeight: "bold" },
  { tag: t.strikethrough, textDecoration: "line-through" },
  { tag: t.invalid, color: "#fc533a" },
])

export const studioSyntaxHighlighting = syntaxHighlighting(studioHighlight)
