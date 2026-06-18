process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://taskapp:taskapp_dev_pw@localhost:5432/taskmanager_test?schema=public';
process.env.JWT_SECRET = 'test_secret_key_for_jest';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.MAX_ATTACHMENTS_PER_TASK = '2';
process.env.MAX_ATTACHMENTS_PER_UPLOAD = '5';
process.env.MAX_ATTACHMENT_SIZE_BYTES = String(10 * 1024 * 1024);
