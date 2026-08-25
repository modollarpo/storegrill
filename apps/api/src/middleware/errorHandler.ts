import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(404, 'NOT_FOUND', id ? `${resource} with id ${id} not found` : `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, 'FORBIDDEN', message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

interface ZodIssueLike {
  path: (string | number | symbol)[];
  message: string;
}

function isZodError(err: unknown): err is ZodError {
  if (typeof err !== 'object' || err === null) return false;
  const candidate = err as { name?: string; issues?: unknown };
  return candidate.name === 'ZodError' && Array.isArray(candidate.issues);
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (isZodError(err)) {
    const issues = (err as unknown as { issues: ZodIssueLike[] }).issues;
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        fields: issues.map(e => ({
          path: e.path.map(String).join('.'),
          message: e.message,
        })),
      },
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  const detail = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack}` : String(err);
  console.error(`[error] ${detail}`);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    },
  });
}
