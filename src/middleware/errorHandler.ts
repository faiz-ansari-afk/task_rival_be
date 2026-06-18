import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../utils/AppError';
import { config } from '../config/env';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
}

const MULTER_ERROR_MESSAGES: Record<string, string> = {
  LIMIT_FILE_SIZE: 'One or more files exceed the maximum allowed size',
  LIMIT_FILE_COUNT: 'Too many files in this upload',
  LIMIT_UNEXPECTED_FILE: 'Too many files in this upload',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      error: {
        code: 'BAD_REQUEST',
        message: MULTER_ERROR_MESSAGES[err.code] ?? `Upload error: ${err.message}`,
      },
    });
    return;
  }

  // Postgres unique violation
  if (typeof err === 'object' && err !== null && 'code' in err && (err as any).code === '23505') {
    res.status(409).json({ error: { code: 'CONFLICT', message: 'Resource already exists' } });
    return;
  }

  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      ...(config.nodeEnv !== 'production' && err instanceof Error ? { debug: err.message } : {}),
    },
  });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
