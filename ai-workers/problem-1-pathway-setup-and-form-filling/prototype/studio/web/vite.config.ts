// Vite 8 + React + Tailwind 4, as the team's frontend (ERv2-frontend@5ccd9fa). Built into web/dist and served by the
// studio API on one port (start.sh). `vite build --watch` while developing.
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "dist", emptyOutDir: true, chunkSizeWarningLimit: 1500 },
  server: { port: 4401, proxy: { "/api": "http://127.0.0.1:4400" } },
});
