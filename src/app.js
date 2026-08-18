const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { getDbState } = require('./config/db');
const httpLogger = require('./middlewares/logger.middleware');
const setupSwagger = require('./docs/swagger');
const authRoutes = require('./routes/auth.routes');
const fileRoutes = require('./routes/file.routes');
const documentRoutes = require('./routes/document.routes');
const imageRoutes = require('./routes/image.routes');
const websiteRoutes = require('./routes/website.routes');
const textRoutes = require('./routes/text.routes');
const trustScoreRoutes = require('./routes/trustScore.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const historyRoutes = require('./routes/history.routes');
const notificationRoutes = require('./routes/notification.routes');
const reportRoutes = require('./routes/report.routes');

const globalErrorHandler = require('./middlewares/error.middleware');
const AppError = require('./utils/appError');
const { DEFAULT_CONFIG, HTTP_STATUS, RESPONSE_MESSAGES } = require('./constants');

function createApp() {
  const app = express();

  // 1. Security & Protection Middlewares
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || ['http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  // 2. Performance & Body Parsing Middlewares
  app.use(compression());
  app.use(express.json({ limit: DEFAULT_CONFIG.MAX_JSON_BODY_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: DEFAULT_CONFIG.MAX_URL_ENCODED_SIZE }));

  // 3. Static File Server for Uploads
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // 4. Winston HTTP Request Logger Middleware
  app.use(httpLogger);

  // 5. Interactive Swagger UI Documentation (/api/docs)
  setupSwagger(app);

  // 6. Health Check Endpoint (Supported at /health, /api/health, and /api/v1/health)
  const healthCheckHandler = (req, res) => {
    const dbState = getDbState();
    const isDbConnected = dbState === 1;

    const responsePayload = {
      server: 'running',
      database: isDbConnected ? 'connected' : 'disconnected',
      ...(isDbConnected && {
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }),
    };

    const statusCode = isDbConnected ? HTTP_STATUS.OK : HTTP_STATUS.SERVICE_UNAVAILABLE;
    res.status(statusCode).json(responsePayload);
  };

  app.get('/health', healthCheckHandler);
  app.get('/api/health', healthCheckHandler);
  app.get('/api/v1/health', healthCheckHandler);

  // 7. Mount API Feature Routes (Supports both /api/v1/* and /api/*)
  const prefixes = [DEFAULT_CONFIG.API_PREFIX, '/api'];
  prefixes.forEach((prefix) => {
    app.use(`${prefix}/auth`, authRoutes);
    app.use(`${prefix}/files`, fileRoutes);
    app.use(`${prefix}/documents`, documentRoutes);
    app.use(`${prefix}/images`, imageRoutes);
    app.use(`${prefix}/websites`, websiteRoutes);
    app.use(`${prefix}/text`, textRoutes);
    app.use(`${prefix}/trust-score`, trustScoreRoutes);
    app.use(`${prefix}/dashboard`, dashboardRoutes);
    app.use(`${prefix}/history`, historyRoutes);
    app.use(`${prefix}/notifications`, notificationRoutes);
    app.use(`${prefix}/reports`, reportRoutes);
  });

  // 8. Global 404 Unhandled Route Middleware (Passes AppError to next)
  app.use((req, res, next) => {
    next(new AppError(`${RESPONSE_MESSAGES.NOT_FOUND} Path: ${req.originalUrl}`, HTTP_STATUS.NOT_FOUND));
  });

  // 9. Centralized Operational Error Handler Middleware
  app.use(globalErrorHandler);

  return app;
}

module.exports = createApp();
