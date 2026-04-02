import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError.js";

function mapZodError(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
}

export const validateBody = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return next(
        new ApiError(
          "Request body validation failed",
          422,
          "VALIDATION_ERROR",
          mapZodError(parsed.error),
        ),
      );
    }
    req.body = parsed.data;
    next();
  };
};

export const validateQuery = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      return next(
        new ApiError(
          "Query validation failed",
          422,
          "VALIDATION_ERROR",
          mapZodError(parsed.error),
        ),
      );
    }
    req.query = parsed.data as Request["query"];
    next();
  };
};

export const validateParams = <T>(schema: ZodSchema<T>) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      return next(
        new ApiError(
          "Path params validation failed",
          422,
          "VALIDATION_ERROR",
          mapZodError(parsed.error),
        ),
      );
    }
    req.params = parsed.data as Request["params"];
    next();
  };
};
