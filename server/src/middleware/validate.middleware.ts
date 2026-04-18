import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: ZodSchema, target: ValidationTarget = "body") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Express 5 makes `req.query` and `req.params` getter-only — direct
    // assignment throws `Cannot set property of IncomingMessage which has
    // only a getter`. `Object.defineProperty` replaces the accessor with a
    // plain data property so controllers still read the parsed (and
    // possibly transformed, e.g. `limit` coerced to Number) values.
    Object.defineProperty(req, target, {
      value: result.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
