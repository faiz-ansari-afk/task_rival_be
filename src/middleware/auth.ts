import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../utils/AppError';

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const tokenFromHeader = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const tokenFromCookie = req.cookies?.accessToken as string | undefined;
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    next(AppError.unauthorized('Authentication token missing'));
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    next(AppError.forbidden('Admin access required'));
    return;
  }
  next();
}
