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
    createMany:  vi.fn(),
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
  workspace:       mockModel(),
  task:            mockModel(),
  track:           mockModel(),
  trackMember:     mockModel(),
  message:         mockModel(),
  directMessage:   mockModel(),
  notification:    mockModel(),
  refreshToken:    mockModel(),

  // Services that wrap multi-step writes in `prisma.$transaction(async (tx) => {})`
  // get the same mock as `tx`, so individual model mocks (user.create, etc.)
  // work inside and outside transactions identically.
  $transaction: vi.fn(async (cb: any) => cb(prismaMock)),
};

export type PrismaMock = typeof prismaMock;

/** Call between tests to reset all call history and return values */
export function resetPrismaMocks() {
  for (const key of Object.keys(prismaMock)) {
    const val = (prismaMock as any)[key];
    if (typeof val === "function" && "mockReset" in val) {
      val.mockReset();
      // $transaction's default behavior must be restored after reset.
      if (key === "$transaction") {
        val.mockImplementation(async (cb: any) => cb(prismaMock));
      }
      continue;
    }
    if (val && typeof val === "object") {
      for (const fn of Object.values(val)) {
        if (fn && typeof (fn as any).mockReset === "function") {
          (fn as any).mockReset();
        }
      }
    }
  }
}
