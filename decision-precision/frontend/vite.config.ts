import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // dev: proxy the API so the browser talks same-origin
      "/api": "http://127.0.0.1:8000",
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
  },
});
