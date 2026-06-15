
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

  $transaction: vi.fn(async (cb: any) => cb(prismaMock)),
};

export type PrismaMock = typeof prismaMock;

export function resetPrismaMocks() {
  for (const key of Object.keys(prismaMock)) {
    const val = (prismaMock as any)[key];
    if (typeof val === "function" && "mockReset" in val) {
      val.mockReset();
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
