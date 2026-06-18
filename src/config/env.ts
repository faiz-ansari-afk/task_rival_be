import dotenv from 'dotenv';

dotenv.config({ debug: false, quiet: true } as any);

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  port: parseInt(process.env.PORT ?? '4000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET', process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  isTest: process.env.NODE_ENV === 'test',

  cloudinary: {
    cloudName: required('CLOUDINARY_CLOUD_NAME', process.env.NODE_ENV === 'test' ? 'test_cloud' : undefined),
    apiKey: required('CLOUDINARY_API_KEY', process.env.NODE_ENV === 'test' ? 'test_key' : undefined),
    apiSecret: required('CLOUDINARY_API_SECRET', process.env.NODE_ENV === 'test' ? 'test_secret' : undefined),
    folder: process.env.CLOUDINARY_FOLDER ?? 'task-manager-attachments',
  },

  attachments: {
    maxFileSizeBytes: parseInt(process.env.MAX_ATTACHMENT_SIZE_BYTES ?? String(10 * 1024 * 1024), 10), // 10MB
    maxFilesPerTask: parseInt(process.env.MAX_ATTACHMENTS_PER_TASK ?? '10', 10),
    maxFilesPerUpload: parseInt(process.env.MAX_ATTACHMENTS_PER_UPLOAD ?? '5', 10),
  },
};
