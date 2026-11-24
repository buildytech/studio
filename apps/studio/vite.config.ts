import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  resolve: {
    alias: {
      "@ui": path.join(rootDir, "src/ui/index.solid.ts"),
    },
  },
  server: {
    // Loopback only: the dev Studio points VITE_API_URL at a local host.
    host: "127.0.0.1",
    port: 5173,
  },
})
