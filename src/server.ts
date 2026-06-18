import { createApp } from './app';
import { config } from './config/env';

// Safety nets: async errors that escape asyncHandler (e.g. thrown from a
// callback rather than an awaited promise) would otherwise crash the
// process silently. Log loudly either way; exit on uncaughtException since
// the process state is no longer trustworthy at that point.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception, shutting down:', err);
  process.exit(1);
});

const app = createApp();

app.listen(config.port, () => {
  console.log(`Server listening on port ${config.port} [${config.nodeEnv}]`);
});
