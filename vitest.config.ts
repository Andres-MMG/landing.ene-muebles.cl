import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "apps/cms/src/**/*.test.ts",
      "apps/web/src/**/*.test.ts",
      "apps/web/src/**/*.test.tsx",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["apps/web/src/**/*.ts", "apps/web/src/**/*.tsx"],
      exclude: ["apps/web/src/**/*.test.ts", "apps/web/src/**/*.test.tsx"],
    },
  },
  resolve: {
    alias: {
      "@": new URL("./apps/web/src", import.meta.url).pathname,
    },
  },
});
