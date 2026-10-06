import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    include: ["src/features/{plans,live,agent,creations}/**/*.test.{ts,tsx}"],
    setupFiles: ["src/features/plans/test-setup.ts"],
  },
});
