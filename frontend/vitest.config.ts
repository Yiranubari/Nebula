import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@nebula/shared": path.resolve(__dirname, "../shared/types/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "src/tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/services/**/*.ts", "src/context/**/*.tsx"],
    },
  },
});
