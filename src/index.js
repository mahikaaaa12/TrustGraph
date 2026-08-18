require('dotenv').config();
const app = require('./app');
const { connectDB, closeDB } = require('./config/db');
const { DEFAULT_CONFIG } = require('./constants');

const PORT = process.env.PORT || DEFAULT_CONFIG.PORT;

/**
 * Application Bootstrap Sequence
 * 1. Loads environment variables (dotenv)
 * 2. Connects to MongoDB Atlas
 * 3. Starts Express HTTP Server Listener
 */
async function startServer() {
  // Enforce Database Connection BEFORE HTTP Server initialization
  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [TrustGraph Engine] Server running on port ${PORT} [Env: ${process.env.NODE_ENV || 'development'}]`);
  });

  /**
   * Graceful Shutdown Handler
   * Stops accepting new HTTP requests, drains active HTTP requests, and closes MongoDB connection pool.
   */
  async function handleGracefulShutdown(signal) {
    console.warn(`[TrustGraph Engine] ${signal} signal received. Initiating graceful shutdown...`);

    server.close(async () => {
      console.log('[TrustGraph Engine] HTTP server stopped listening.');
      await closeDB();
      console.log('[TrustGraph Engine] Process exiting cleanly.');
      process.exit(0);
    });

    // Force terminate process if graceful shutdown exceeds 10 seconds
    setTimeout(() => {
      console.error('[TrustGraph Engine] Graceful shutdown timed out, forcefully exiting.');
      process.exit(1);
    }, 10000);
  }

  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[TrustGraph Engine] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[TrustGraph Engine] Uncaught Exception thrown:', error);
  process.exit(1);
});

startServer();
