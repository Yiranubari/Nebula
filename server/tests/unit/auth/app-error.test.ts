
import { describe, it, expect } from "vitest";
import { AppError } from "../../../src/utils/AppError";

describe("AppError", () => {
  it("creates an error with the correct status and message", () => {
    const err = new AppError(404, "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("Not found");
  });

  it("is operational by default", () => {
    const err = new AppError(400, "Bad request");
    expect(err.isOperational).toBe(true);
  });

  it("captures the stack trace", () => {
    const err = new AppError(500, "Internal error");
    expect(err.stack).toBeDefined();
  });
});
