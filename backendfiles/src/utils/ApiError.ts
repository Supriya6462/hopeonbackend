export class ApiError extends Error {
  public statusCode: number;
  public code: string;
  public details: unknown;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code?: string,
    details?: unknown
  ) {
    super(message);

    this.statusCode = statusCode;
    this.code = code ?? this.getDefaultCode(statusCode);
    this.details = details ?? null;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }

  private getDefaultCode(statusCode: number): string {
    const codes: Record<number, string> = {
      400: "BAD_REQUEST",
      401: "UNAUTHORIZED",
      403: "FORBIDDEN",
      404: "NOT_FOUND",
      409: "CONFLICT",
      422: "VALIDATION_ERROR",
      500: "INTERNAL_SERVER_ERROR",
    };

    return codes[statusCode] ?? "SERVER_ERROR";
  }
}
