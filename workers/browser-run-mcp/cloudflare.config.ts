import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "spike-browser-run-mcp",
    entrypoint: "./src/index.ts",
    compatibilityDate: "2026-10-17",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: true,
    observability: {
      enabled: true,
      traces: {
        enabled: true,
      },
    },
    env: {
      BROWSER: bindings.browser(),
    },
  }),
});
