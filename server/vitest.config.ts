import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    exclude: ["tests/integration/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/**/*.d.ts"],
    },
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
          environment: "node",
          env: {
            NODE_ENV: "test",
            DATABASE_URL: "postgres://test:test@localhost:5432/test",
            JWT_SECRET: "test-jwt-secret",
            JWT_REFRESH_SECRET: "test-jwt-refresh-secret",
          },
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: { NODE_ENV: "test" },
        },
      },
    ],
  },
});
