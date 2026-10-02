import { defineConfig } from "@neon/config/v1";

export const LICENSE_STORAGE_BUCKET = "itas-license-files";

export default defineConfig({
  buckets: {
    [LICENSE_STORAGE_BUCKET]: { access: "private" },
  },
});
