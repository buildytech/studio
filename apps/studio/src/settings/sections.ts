import { defineSettingsSections } from "./registry"

/**
 * The built-in Settings sections (ADR 0007). To add one: write sections/<Name>.tsx (default export, props
 * SettingsSectionProps), add its words under section.<id> in i18n/settings.en.json and settings.ru.json, its glyph
 * in app-icons/settings-icons.tsx if new, and an entry here. The menu, the deep link /settings/<id> and the search
 * pick it up.
 */
export const SETTINGS_SECTIONS = defineSettingsSections([
  { id: "general", group: "app", order: 10, icon: "sliders", label: "section.general", storage: ["client"], load: () => import("./sections/General") },
  { id: "appearance", group: "app", order: 20, icon: "palette", label: "section.appearance", storage: ["client"], load: () => import("./sections/Appearance") },
  { id: "models", group: "agent", order: 10, icon: "bot", label: "section.models", storage: ["server"], load: () => import("./sections/Models") },
  { id: "account", group: "agent", order: 20, icon: "user", label: "section.account", storage: ["server"], load: () => import("./sections/Account") },
  { id: "server", group: "system", order: 10, icon: "server", label: "section.server", storage: ["desktop", "server"], load: () => import("./sections/Server") },
  { id: "about", group: "system", order: 20, icon: "info", label: "section.about", storage: ["desktop", "server"], load: () => import("./sections/About") },
])

/** /settings without a section opens this one. */
export const DEFAULT_SETTINGS_SECTION = "general"
