import cloudinary from '../config/cloudinary';
import { config } from '../config/env';
import { AppError } from '../utils/AppError';
import type { UploadApiResponse } from 'cloudinary';

function resourceTypeForMime(mimeType: string): 'image' | 'raw' {
  return mimeType.startsWith('image/') ? 'image' : 'raw';
}

export const CloudinaryService = {
  async uploadBuffer(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadApiResponse> {
    const resourceType = resourceTypeForMime(mimeType);

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: config.cloudinary.folder,
          resource_type: resourceType,
          // Keep the original filename recognizable in the Cloudinary dashboard
          // without relying on it for anything functional.
          filename_override: originalName,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(AppError.internal(`Upload to Cloudinary failed: ${error?.message ?? 'unknown error'}`));
            return;
          }
          resolve(result);
        }
      );
      stream.end(buffer);
    });
  },

  async deleteAsset(publicId: string, resourceType: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType === 'image' ? 'image' : 'raw',
      });
    } catch (err) {
      // Swallow errors here: a failed remote delete shouldn't block removing
      // the DB row, and an orphaned Cloudinary asset is a cleanup concern,
      // not a user-facing failure.
      console.error(`Failed to delete Cloudinary asset ${publicId}:`, err);
    }
  },
};
