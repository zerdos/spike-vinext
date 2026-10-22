import { bindings, defineConfig, defineWorker, exports, triggers } from "cf/config";
import { createWorkersResponseStoreServiceBindingConfig } from "@vinext/cloudflare/cache/config";

const responseStore = await createWorkersResponseStoreServiceBindingConfig({
  worker: {
    name: "spike-vinext-response-store",
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat"],
  },
  bucket: "spike-vinext-response-store-cache-bodies",
});

export const responseStoreServiceBinding = responseStore.serviceBindingWorker;

export default defineConfig({
  worker: defineWorker({
    ...responseStore.applicationWorker,
    name: "spike-vinext",
    entrypoint: "./worker/index.ts",
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat"],
    workersDev: true,
    previewUrls: true,
    assets: { notFoundHandling: "none" },
    triggers: [
      triggers.fetch({ pattern: "spike.land/*", zone: "spike.land" }),
      triggers.fetch({ pattern: "www.spike.land/*", zone: "spike.land" }),
    ],
    exports: {
      CodemodeAgent: exports.durableObject({ storage: "sqlite" }),
      CodemodeRuntime: exports.durableObject({ storage: "sqlite" }),
    },
    env: {
      ...responseStore.applicationWorker.env,
      ASSETS: bindings.assets(),
      BROWSER: bindings.browser(),
      DB: bindings.d1({
        id: "013edfbd-5b02-4543-8b73-af5d9721fe0e",
        name: "spike-waitlist",
      }),
      SESSION_KV: bindings.kv({
        id: "adf12f5b631b445086eb029abae41b24",
      }),
      LOADER: bindings.workerLoader(),
      CODEMODE_AGENT: bindings.durableObject({
        worker: "spike-vinext",
        exportName: "CodemodeAgent",
      }),
    },
  }),
});
