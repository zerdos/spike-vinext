import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./test/setup.ts"],
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    server: {
      deps: {
        inline: ["@cloudflare/codemode"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./"),
      "cloudflare:workers": path.resolve(import.meta.dirname, "./test/mocks/cloudflare-workers.ts"),
    },
  },
});
