import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"

/**
 * The desktop app's start screen (buildytech/vibechat-desktop embeds dist-shell): connect a server or set up a new
 * one. No Studio, no projects: the app is a window to the owner's vibechat-server.
 */
export default defineConfig({
  plugins: [solid(), tailwindcss()],
  build: {
    outDir: "dist-shell",
    emptyOutDir: true,
    rollupOptions: { input: "shell.html" },
  },
})
