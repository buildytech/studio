// Enter sends once: not Shift+Enter (a new line), not the Enter that ends an IME composition, not a held key's repeats.
export function isSendKey(e: Pick<KeyboardEvent, "key" | "shiftKey" | "isComposing" | "repeat">): boolean {
  return e.key === "Enter" && !e.shiftKey && !e.isComposing && !e.repeat
}
