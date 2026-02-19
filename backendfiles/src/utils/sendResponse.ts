import { Response } from "express";

interface ApiResponse<T> {
  statusCode?: number;
  message?: string;
  data?: T;
  meta?: object;
  error?: unknown;
}

export const sendResponse = <T>(
  res: Response,
  {
    statusCode = 200,
    message = "Success",
    data,
    meta = {},
    error = null,
  }: ApiResponse<T>
) => {
  res.status(statusCode).json({
    success: statusCode < 400,
    message,
    data: data ?? null,
    error,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
};
