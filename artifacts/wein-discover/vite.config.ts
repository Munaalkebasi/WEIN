import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import { discoveryApiPlugin } from "./src/server/discovery/vite-plugin";

const port = Number(process.env.PORT || 5173);
const basePath = process.env.BASE_PATH || "/";
export const plansProxyPattern = "^/api/plans(?:[/?]|$)";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  return {
    base: basePath,

    plugins: [discoveryApiPlugin(), react(), tailwindcss()],

    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },

    root: path.resolve(import.meta.dirname),

    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },

    server: {
      proxy: {
        [plansProxyPattern]: {
          target: env.PLANS_API_URL || "http://127.0.0.1:3001",
          changeOrigin: true,
        },
      },
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },

    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
