const app = require('./app');
const { env } = require('./config/env');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const logger = require('./utils/logger');

async function startServer() {
  try {
    await connectDatabase();

    const server = app.listen(env.PORT, () => {
      logger.info(`SCOSHA API listening on port ${env.PORT} [${env.NODE_ENV}]`);
      logger.info(`Health: http://localhost:${env.PORT}/api/v1/health`);
      logger.info(`Docs:   http://localhost:${env.PORT}/api/docs`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received — shutting down gracefully`);
      const force = setTimeout(() => {
        logger.error('Shutdown timed out — forcing exit');
        process.exit(1);
      }, 10_000);
      force.unref();
      server.close(async () => {
        try {
          await disconnectDatabase();
          logger.info('HTTP server and database connection closed');
          clearTimeout(force);
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { message: error.message });
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { message: error.message, stack: error.stack });
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server', { message: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();
