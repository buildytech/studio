import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [solid(), tailwindcss()],
  server: {
    // Loopback only: the dev Studio points VITE_API_URL at a local host.
    host: "127.0.0.1",
    port: 5173,
  },
})
