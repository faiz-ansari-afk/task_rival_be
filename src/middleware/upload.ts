import multer from 'multer';
import { Request } from 'express';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  // 'image/svg+xml',
  // // Documents
  // 'application/pdf',
  // 'application/msword',
  // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // 'application/vnd.ms-excel',
  // 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // 'text/plain',
  // 'text/csv',
]);

function fileFilter(_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    callback(AppError.badRequest(`Unsupported file type: ${file.mimetype}`));
    return;
  }
  callback(null, true);
}

export const uploadAttachments = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.attachments.maxFileSizeBytes,
    files: config.attachments.maxFilesPerUpload,
  },
  fileFilter,
});
