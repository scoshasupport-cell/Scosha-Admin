const express = require('express');
const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../utils/asyncHandler');
const { ApiResponse } = require('../utils/ApiResponse');

const router = express.Router();

async function databaseReady() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

router.get(
  '/live',
  asyncHandler(async (_req, res) => {
    return ApiResponse.success(res, {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    }, 'Process is alive');
  })
);

router.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const ready = await databaseReady();
    if (!ready) {
      return res.status(503).json({
        success: false,
        message: 'Database is not ready',
        data: { status: 'not_ready', database: { status: 'disconnected' } },
      });
    }
    return ApiResponse.success(res, {
      status: 'ready',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: { status: 'connected' },
    }, 'Service is ready');
  })
);

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const ready = await databaseReady();
    const payload = {
      status: ready ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: { status: ready ? 'connected' : 'disconnected' },
    };
    if (!ready) {
      return res.status(503).json({
        success: false,
        message: 'Service is not ready',
        data: payload,
      });
    }
    return ApiResponse.success(res, payload, 'Service is healthy');
  })
);

module.exports = router;
