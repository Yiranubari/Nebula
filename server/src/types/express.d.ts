import type { User } from "@nebula/shared";

declare global {
  namespace Express {
    interface Request {
      user?: Pick<User, "id" | "name" | "role" | "email">;
    }
  }
}

export {};
