import { Request, Response, NextFunction } from "express";
import { AppError } from "../../utils/AppError";
import { verifyAccessToken } from "../../utils/jwt";
import { prisma } from "../../db/prisma";

export const protect = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      next(
        new AppError(401, "You are not logged in. Please log in to get access.")
      );
      return;
    }

    const decoded = verifyAccessToken(token);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!currentUser) {
      next(
        new AppError(
          401,
          "The user belonging to this token does no longer exist."
        )
      );
      return;
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(new AppError(401, "Invalid token. Please log in again."));
    return;
  }
};
