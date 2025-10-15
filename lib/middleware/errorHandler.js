// lib/middleware/errorHandler.js - Error Handling Middleware
// Last updated: 2025-01-15

const { ValidationError } = require('../utils/validation');
const { ScraperError, UnsupportedStoreError } = require('../scraper');

/**
 * Format error for response
 * @param {Error} error - Error object
 * @param {boolean} isDevelopment - Development mode flag
 * @returns {Object} Formatted error
 */
const formatError = (error, isDevelopment = false) => {
  const formatted = {
    message: error.message || 'An error occurred',
    code: error.code || 'ERROR',
    timestamp: new Date().toISOString()
  };

  // Add details in development mode
  if (isDevelopment) {
    formatted.stack = error.stack;
    formatted.name = error.name;
    
    if (error.details) {
      formatted.details = error.details;
    }
  }

  return formatted;
};

/**
 * Determine HTTP status code from error
 * @param {Error} error - Error object
 * @returns {number} HTTP status code
 */
const getStatusCode = (error) => {
  // Explicit status
  if (error.status) {
    return error.status;
  }

  // By error type
  if (error.name === 'ValidationError') {
    return 400;
  }

  if (error.name === 'UnsupportedStoreError') {
    return 400;
  }

  if (error.name === 'ScraperError') {
    return 502;
  }

  if (error.code === 'UNAUTHORIZED' || error.code === 'INVALID_API_KEY') {
    return 401;
  }

  if (error.code === 'FORBIDDEN') {
    return 403;
  }

  if (error.code === 'NOT_FOUND') {
    return 404;
  }

  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    return 429;
  }

  // Default to 500
  return 500;
};

/**
 * Main error handler middleware
 * @param {Function} handler - Route handler
 * @returns {Function} Wrapped handler with error handling
 */
const errorHandler = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('Request error:', {
      url: req.url,
      method: req.method,
      error: error.message,
      stack: error.stack
    });

    const isDevelopment = process.env.NODE_ENV === 'development';
    const statusCode = getStatusCode(error);
    const formattedError = formatError(error, isDevelopment);

    // Handle validation errors specially
    if (error instanceof ValidationError || error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: error.errors || error.details || []
        },
        timestamp: new Date().toISOString()
      });
    }

    // Handle scraper errors
    if (error instanceof ScraperError || error instanceof UnsupportedStoreError) {
      return res.status(statusCode).json({
        success: false,
        error: {
          message: error.message,
          code: error.code,
          ...(error.details && { details: error.details })
        },
        timestamp: new Date().toISOString()
      });
    }

    // Generic error response
    return res.status(statusCode).json({
      success: false,
      error: formattedError
    });
  }
};

/**
 * Async error wrapper (alternative approach)
 * Wraps async functions to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} Wrapped function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    console.error('Async handler error:', error);
    
    const statusCode = getStatusCode(error);
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(statusCode).json({
      success: false,
      error: formatError(error, isDevelopment)
    });
  });
};

/**
 * Not found handler (404)
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Route not found: ${req.method} ${req.url}`,
      code: 'NOT_FOUND'
    },
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  
  // Utilities (for testing)
  formatError,
  getStatusCode
};