const { prisma } = require('./prisma');
const logger = require('../utils/logger');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function connectDatabase(retries = MAX_RETRIES) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      await prisma.$connect();
      logger.info('MySQL connected successfully via Prisma');
      return prisma;
    } catch (error) {
      logger.error(`MySQL connection attempt ${attempt}/${retries} failed`, {
        message: error.message,
      });

      if (attempt === retries) {
        logger.error('MySQL connection failed after maximum retries');
        throw error;
      }

      logger.warn(`Retrying MySQL connection in ${RETRY_DELAY_MS / 1000}s...`);
      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('MySQL connection closed');
}

module.exports = {
  connectDatabase,
  disconnectDatabase,
  prisma,
};
