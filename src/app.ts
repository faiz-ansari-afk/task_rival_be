import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { config } from './config/env';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import attachmentRoutes from './routes/attachmentRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

export function createApp(): Application {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;

      console.log(
        `✅ ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
      );
    });

    next();
  });
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts, please try again later' } },
  });

  app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

  app.use('/auth', authLimiter, authRoutes);
  app.use('/tasks', taskRoutes);
  app.use('/tasks/:taskId/attachments', attachmentRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
