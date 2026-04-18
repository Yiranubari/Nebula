import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Unit tests
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["tests/integration/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/**/*.d.ts"],
    },
    // Separate integration project (needs a running DB)
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          // Integration tests use a real test DB — set TEST_DATABASE_URL in .env.test
          env: { NODE_ENV: "test" },
        },
      },
    ],
  },
});
