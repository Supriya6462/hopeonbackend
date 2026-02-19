import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

// export class AppError extends Error {
//   statusCode: number;
//   isOperational: boolean;

//   constructor(message: string, statusCode: number = 500) {
//     super(message);
//     this.statusCode = statusCode;
//     this.isOperational = true;
//     Error.captureStackTrace(this, this.constructor);
//   }
// }

// export const errorHandler = (
//   err: any,
//   _req: Request,
//   res: Response,
//   _next: NextFunction
// ) => {
//   err.statusCode = err.statusCode || 500;
//   err.status = err.status || "error";

//   if (process.env.NODE_ENV === "development") {
//     res.status(err.statusCode).json({
//       success: false,
//       error: err,
//       message: err.message,
//       stack: err.stack,
//     });
//   } else {
//     // Production
//     if (err.isOperational) {
//       res.status(err.statusCode).json({
//         success: false,
//         message: err.message,
//       });
//     } else {
//       console.error("ERROR 💥", err);
//       res.status(500).json({
//         success: false,
//         message: "Something went wrong",
//       });
//     }
//   }
// };

export const errorHandler =(err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  let error = err;
  if(!(error instanceof ApiError)) {
        console.error("Unexpected Error 💥", error);
        error = new ApiError("Something went wrong", 500, "INTERNAL_SERVER_ERROR");
  }

  const apiErr = error as ApiError;
  res.status(apiErr.statusCode).json({
    success: false,
    message: apiErr.message,
    code: apiErr.statusCode,
    details: apiErr.details,
    ...(process.env.NODE_ENV === "development" && { stack: apiErr.stack })
  });
}

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
