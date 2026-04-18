/**
 * Shared Prisma client mock for unit tests.
 *
 * Each model property is a plain object of vi.fn() spies.
 * Services receive `prismaMock as any` so TypeScript doesn't complain about
 * Prisma's fluent-client types — and tests call methods directly.
 *
 * Usage:
 *   import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
 *   prismaMock.user.findUnique.mockResolvedValueOnce({ id: "u1", ... });
 */

import { vi } from "vitest";

function mockModel() {
  return {
    findUnique:  vi.fn(),
    findFirst:   vi.fn(),
    findMany:    vi.fn(),
    create:      vi.fn(),
    update:      vi.fn(),
    updateMany:  vi.fn(),
    delete:      vi.fn(),
    deleteMany:  vi.fn(),
    upsert:      vi.fn(),
    count:       vi.fn(),
    aggregate:   vi.fn(),
  };
}

export const prismaMock = {
  user:            mockModel(),
  task:            mockModel(),
  track:           mockModel(),
  trackMember:     mockModel(),
  message:         mockModel(),
  directMessage:   mockModel(),
  notification:    mockModel(),
  refreshToken:    mockModel(),
};

export type PrismaMock = typeof prismaMock;

/** Call between tests to reset all call history and return values */
export function resetPrismaMocks() {
  for (const model of Object.values(prismaMock)) {
    for (const fn of Object.values(model)) {
      fn.mockReset();
    }
  }
}
