import { describe, it, expect, beforeEach } from "vitest";
import { UsersService } from "../../../src/modules/users/users.service";
import { prismaMock, resetPrismaMocks } from "../../helpers/prisma-mock";
import { AppError } from "../../../src/utils/AppError";

const service = new UsersService(prismaMock as any);

const WS = "ws1";

const baseUser = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
  role: "MEMBER" as const,
  avatar: null,
  workspaceId: WS,
  createdAt: new Date(),
};

beforeEach(() => resetPrismaMocks());

describe("UsersService.getAllUsers", () => {
  it("returns users scoped to workspace", async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([baseUser]);
    const result = await service.getAllUsers(WS);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("u1");
    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: WS } })
    );
  });
});

describe("UsersService.getUserById", () => {
  it("throws 404 if not found in this workspace", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(null);
    await expect(service.getUserById(WS, "bad-id")).rejects.toThrow(AppError);
  });

  it("returns sanitised user", async () => {
    prismaMock.user.findFirst.mockResolvedValueOnce(baseUser);
    const result = await service.getUserById(WS, "u1");
    expect(result.id).toBe("u1");
    expect(result).not.toHaveProperty("passwordHash");
  });
});

describe("UsersService.updateProfile", () => {
  it("updates name and returns sanitised user", async () => {
    prismaMock.user.update.mockResolvedValueOnce({ ...baseUser, name: "Alicia" });
    const result = await service.updateProfile("u1", { name: "Alicia" });
    expect(result.name).toBe("Alicia");
  });
});
