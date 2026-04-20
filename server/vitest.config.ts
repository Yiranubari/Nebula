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
          // `src/config/env.ts` uses envalid, which exits the process when
          // required variables are missing. Provide dummy values so unit
          // tests that transitively import it don't kill the test runner.
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
          // Integration tests use a real test DB — set TEST_DATABASE_URL in .env.test
          env: { NODE_ENV: "test" },
        },
      },
    ],
  },
});
