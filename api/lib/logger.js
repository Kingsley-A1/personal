/**
 * REIGN API - Logger Module
 * ============================================
 * Structured JSON logging using Pino for production-grade logging.
 * 
 * Features:
 * - JSON format for easy parsing
 * - Log levels (trace, debug, info, warn, error, fatal)
 * - Request logging with pino-http
 * - Pretty printing in development
 * 
 * @module lib/logger
 */

const pino = require('pino');

// ============================================
// CONFIGURATION
// ============================================

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Base logger configuration
 */
const loggerOptions = {
    level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

    // Add timestamp in ISO format
    timestamp: pino.stdTimeFunctions.isoTime,

    // Base object included in all logs
    base: {
        app: 'reign-api',
        version: '2.2.0'
    },

    // Redact sensitive fields from logs
    redact: {
        paths: ['password', 'token', 'authorization', 'refreshToken', 'req.headers.authorization'],
        censor: '[REDACTED]'
    }
};

// Pretty print in development
if (isDevelopment) {
    loggerOptions.transport = {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    };
}

/**
 * Main application logger
 */
const logger = pino(loggerOptions);

// ============================================
// HTTP REQUEST LOGGING
// ============================================

const pinoHttp = require('pino-http');

/**
 * HTTP request logger middleware
 * Automatically logs all incoming requests and responses
 */
const httpLogger = pinoHttp({
    logger,

    // Customize the log level based on response status
    customLogLevel: (req, res, err) => {
        if (res.statusCode >= 500 || err) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
    },

    // Customize what gets logged
    serializers: {
        req: (req) => ({
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            // Don't log body to avoid leaking sensitive data
        }),
        res: (res) => ({
            statusCode: res.statusCode
        })
    },

    // Custom success message
    customSuccessMessage: (req, res) => {
        return `${req.method} ${req.url} - ${res.statusCode}`;
    },

    // Custom error message
    customErrorMessage: (req, res, err) => {
        return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },

    // Quiet certain paths (like health checks)
    autoLogging: {
        ignore: (req) => {
            // Don't log health check requests in production
            return !isDevelopment && req.url === '/api/health';
        }
    }
});

// ============================================
// CONVENIENCE METHODS
// ============================================

/**
 * Log an audit event (structured for analysis)
 * @param {Object} data - Audit data
 */
function audit(data) {
    logger.info({
        type: 'audit',
        ...data
    });
}

/**
 * Log a database query (for debugging)
 * @param {string} query - SQL query
 * @param {number} duration - Query duration in ms
 */
function dbQuery(query, duration) {
    if (isDevelopment) {
        logger.debug({
            type: 'db_query',
            query: query.substring(0, 100),
            duration: `${duration}ms`
        });
    }
}

/**
 * Log an API error
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
function apiError(error, context = {}) {
    logger.error({
        type: 'api_error',
        error: error.message,
        stack: isDevelopment ? error.stack : undefined,
        ...context
    });
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    logger,
    httpLogger,
    audit,
    dbQuery,
    apiError
};
