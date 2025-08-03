import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import { setupKpiApi } from "./vite.express-middleware"

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: "kpi-api-middleware",
      configureServer(server) {
        // @ts-expect-error: Vite dev server usa .app de Express
        setupKpiApi(server.app);
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
