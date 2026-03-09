import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    host: true, // bind to 0.0.0.0 so LAN devices can connect
    proxy: {
      '/api': 'http://localhost:3000', // forward API calls to Express
    },
  },
})
