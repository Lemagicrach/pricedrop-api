// lib/middleware/index.js - Middleware Exports & Composition
// Last updated: 2025-01-15

const { corsMiddleware, corsWithOptions } = require('./cors');
const { authMiddleware, optionalAuth, authenticate } = require('./auth');
const { errorHandler, asyncHandler, notFoundHandler } = require('./errorHandler');

/**
 * Compose multiple middleware functions
 * Applies middleware from right to left (like function composition)
 * 
 * Example: compose(a, b, c)(handler) = a(b(c(handler)))
 * 
 * @param {...Function} middlewares - Middleware functions to compose
 * @returns {Function} Composed middleware function
 */
const compose = (...middlewares) => (handler) => {
  return middlewares.reduceRight(
    (wrapped, middleware) => middleware(wrapped),
    handler
  );
};

/**
 * Public route - CORS + Error handling (no authentication)
 * Use for endpoints that don't require an API key
 * 
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 * 
 * @example
 * module.exports = publicRoute(async (req, res) => {
 *   res.json({ message: 'Hello world' });
 * });
 */
const publicRoute = (handler) => {
  return compose(
    corsMiddleware,
    errorHandler
  )(handler);
};

/**
 * Protected route - CORS + Auth + Error handling
 * Use for endpoints that require authentication
 * 
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 * 
 * @example
 * module.exports = protectedRoute(async (req, res) => {
 *   // req.user is available here
 *   res.json({ user: req.user });
 * });
 */
const protectedRoute = (handler) => {
  return compose(
    corsMiddleware,
    authMiddleware,
    errorHandler
  )(handler);
};

/**
 * Optional auth route - CORS + Optional Auth + Error handling
 * Authentication is attempted but not required
 * 
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler
 */
const optionalAuthRoute = (handler) => {
  return compose(
    corsMiddleware,
    optionalAuth,
    errorHandler
  )(handler);
};

/**
 * Custom route - Compose your own middleware stack
 * 
 * @param {Array<Function>} middlewares - Array of middleware functions
 * @returns {Function} Route wrapper
 * 
 * @example
 * const myRoute = customRoute([corsMiddleware, authMiddleware]);
 * module.exports = myRoute(async (req, res) => { ... });
 */
const customRoute = (middlewares) => (handler) => {
  return compose(...middlewares, errorHandler)(handler);
};

// ========================================
// Legacy API (backward compatibility)
// ========================================

/**
 * @deprecated Use publicRoute or protectedRoute instead
 */
const withRapidAPI = (handler, options = {}) => {
  const { skipAuth = false } = options;
  
  console.warn('withRapidAPI is deprecated. Use publicRoute or protectedRoute instead.');
  
  if (skipAuth) {
    return publicRoute(handler);
  }
  
  return protectedRoute(handler);
};

/**
 * @deprecated Use protectedRoute instead
 */
const validateRapidAPI = (handler) => {
  console.warn('validateRapidAPI is deprecated. Use protectedRoute instead.');
  return protectedRoute(handler);
};

/**
 * @deprecated Use corsMiddleware directly
 */
const withCORS = corsMiddleware;

// ========================================
// Exports
// ========================================

module.exports = {
  // ✅ Recommended API
  publicRoute,
  protectedRoute,
  optionalAuthRoute,
  customRoute,
  
  // ✅ Middleware components
  corsMiddleware,
  corsWithOptions,
  authMiddleware,
  optionalAuth,
  authenticate,
  errorHandler,
  asyncHandler,
  notFoundHandler,
  
  // ✅ Utilities
  compose,
  
  // ⚠️ Legacy API (backward compatibility)
  withRapidAPI,
  validateRapidAPI,
  withCORS
};