// lib/middleware/cors.js - CORS Middleware
// Last updated: 2025-01-15

/**
 * CORS middleware - Enables cross-origin requests
 * Handles preflight OPTIONS requests and sets appropriate headers
 * 
 * @param {Function} handler - Route handler function
 * @returns {Function} Wrapped handler with CORS support
 */
const corsMiddleware = (handler) => async (req, res) => {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-RapidAPI-Key, X-RapidAPI-Host, X-API-Key, X-RapidAPI-Proxy-Secret'
  );
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Continue to next middleware/handler
  return handler(req, res);
};

/**
 * CORS middleware with custom configuration
 * @param {Object} options - CORS options
 * @param {string|Array} options.origin - Allowed origins
 * @param {Array} options.methods - Allowed HTTP methods
 * @param {Array} options.headers - Allowed headers
 * @returns {Function} Configured CORS middleware
 */
const corsWithOptions = (options = {}) => (handler) => async (req, res) => {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization', 'X-RapidAPI-Key'],
    credentials = false,
    maxAge = 86400
  } = options;

  // Set origin
  if (Array.isArray(origin)) {
    const requestOrigin = req.headers.origin;
    if (origin.includes(requestOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Set other headers
  res.setHeader('Access-Control-Allow-Methods', methods.join(', '));
  res.setHeader('Access-Control-Allow-Headers', headers.join(', '));
  res.setHeader('Access-Control-Max-Age', String(maxAge));
  
  if (credentials) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return handler(req, res);
};

module.exports = {
  corsMiddleware,
  corsWithOptions
};