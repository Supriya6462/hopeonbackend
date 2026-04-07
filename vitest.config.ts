import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["backendfiles/**/*.test.ts"],
    exclude: ["dist/**", "node_modules/**"],
  },
});
