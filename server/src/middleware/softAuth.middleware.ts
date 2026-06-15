import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";

export const softAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return next();
    const token = header.slice(7);
    const claims = verifyAccessToken(token);
    (req as any).user = {
      id: claims.userId,
      role: claims.role,
      workspaceId: claims.workspaceId,
    };
  } catch {
  }
  next();
};
