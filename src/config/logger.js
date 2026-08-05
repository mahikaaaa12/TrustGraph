const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Winston RFC 5424 Log Level Priorities
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Log Level Color Palette for Console Output
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

/**
 * Development Console Log Format
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `[${info.timestamp}] [${info.level}]: ${info.message}`
  )
);

/**
 * Production JSON Log Format (Optimized for ELK / Datadog / CloudWatch)
 */
const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

/**
 * Winston Logger Configuration Instance
 */
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'http',
  levels,
  format: process.env.NODE_ENV === 'development' ? devFormat : prodFormat,
  transports: [
    // 1. Console Output Transport
    new winston.transports.Console(),

    // 2. Error Log File Transport (Captures level 'error' only)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB limit
      maxFiles: 5,
    }),

    // 3. Combined Log File Transport (Captures all log levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB limit
      maxFiles: 5,
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
  ],
});

module.exports = logger;
