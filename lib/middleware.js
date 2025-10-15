// lib/middleware.js - Complete Middleware System
// Last updated: 2025-01-15

const { authenticate } = require('./middleware/auth');

/**
 * CORS middleware - Enables cross-origin requests
 */
const withCORS = (handler) => async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-RapidAPI-Key, X-RapidAPI-Host, X-API-Key');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  return handler(req, res);
};

/**
 * Error handling middleware - Catches and formats errors
 */
const withErrorHandler = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('Request error:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: 'VALIDATION_ERROR',
          details: error.errors || error.details
        },
        timestamp: new Date().toISOString()
      });
    }

    // Handle scraper errors
    if (error.name === 'ScraperError' || error.name === 'UnsupportedStoreError') {
      return res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'SCRAPER_ERROR',
          details: error.details
        },
        timestamp: new Date().toISOString()
      });
    }

    // Handle custom errors with status code
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'ERROR'
        },
        timestamp: new Date().toISOString()
      });
    }

    // Handle unknown errors
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return res.status(500).json({
      success: false,
      error: {
        message: isDevelopment ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR',
        ...(isDevelopment && { stack: error.stack })
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Authentication middleware - Validates API keys
 */
const withAuth = (handler) => async (req, res) => {
  const authResult = await authenticate(req, res);
  if (!authResult) return; // Response already sent by authenticate
  
  return handler(req, res);
};

/**
 * Compose multiple middleware functions
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} Composed middleware
 */
const compose = (...middlewares) => (handler) => {
  return middlewares.reduceRight(
    (wrapped, middleware) => middleware(wrapped),
    handler
  );
};

/**
 * Public route - CORS + Error handling (no auth required)
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 */
const publicRoute = (handler) => {
  return compose(
    withCORS,
    withErrorHandler
  )(handler);
};

/**
 * Protected route - CORS + Auth + Error handling
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 */
const protectedRoute = (handler) => {
  return compose(
    withCORS,
    withAuth,
    withErrorHandler
  )(handler);
};

/**
 * Legacy RapidAPI middleware (for backward compatibility)
 * @deprecated Use publicRoute or protectedRoute instead
 */
const withRapidAPI = (handler, options = {}) => {
  const { skipAuth = false } = options;
  
  if (skipAuth) {
    return publicRoute(handler);
  }
  
  return protectedRoute(handler);
};

/**
 * Legacy validation middleware (for backward compatibility)
 * @deprecated Use protectedRoute instead
 */
const validateRapidAPI = (handler) => protectedRoute(handler);

module.exports = {
  // ✅ New API (recommended)
  publicRoute,
  protectedRoute,
  
  // ✅ Middleware components
  withCORS,
  withAuth,
  withErrorHandler,
  compose,
  
  // ⚠️ Legacy API (for backward compatibility)
  withRapidAPI,
  validateRapidAPI
};