import { bindings, defineConfig, defineWorker } from "cf/config";
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
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-13",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ...responseStore.applicationWorker.env,
      ASSETS: bindings.assets(),
    },
  }),
});
