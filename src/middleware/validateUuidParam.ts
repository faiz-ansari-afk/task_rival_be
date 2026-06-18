import { Request, Response, NextFunction } from 'express';
import { isValidUuid } from '../utils/uuid';
import { AppError } from '../utils/AppError';

export function validateUuidParam(paramName: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const value = req.params[paramName];
    if (!isValidUuid(value)) {
      next(AppError.badRequest(`Invalid ${paramName}: must be a valid UUID`));
      return;
    }
    next();
  };
}
