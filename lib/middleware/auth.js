// lib/middleware/auth.js - Authentication Middleware
// Last updated: 2025-01-15

const { verifyRapidAPI, checkRateLimit } = require('../../services/rapidapi');
const { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } = require('../../config/constants');

/**
 * Extract header value (case-insensitive)
 * @param {Object} req - Request object
 * @param {string} name - Header name
 * @returns {string|undefined} Header value
 */
const getHeader = (req, name) => {
  if (!req || !req.headers) {
    return undefined;
  }

  const lowerName = name.toLowerCase();
  
  // Direct lookup
  if (lowerName in req.headers) {
    return req.headers[lowerName];
  }

  // Case-insensitive search
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return undefined;
};

/**
 * Normalize plan name to uppercase
 * @param {string} plan - Plan name
 * @returns {string} Normalized plan name
 */
const normalizePlan = (plan) => {
  if (!plan || typeof plan !== 'string') {
    return 'FREE';
  }
  return plan.trim().toUpperCase();
};

/**
 * Get rate limits for a plan
 * @param {string} plan - Plan name
 * @returns {Object} Plan and limits
 */
const resolvePlanLimits = (plan) => {
  const normalized = normalizePlan(plan);
  
  if (RATE_LIMITS[normalized]) {
    return { plan: normalized, limits: RATE_LIMITS[normalized] };
  }

  return { plan: 'FREE', limits: RATE_LIMITS.FREE };
};

/**
 * Send error response
 * @param {Object} res - Response object
 * @param {number} status - HTTP status code
 * @param {Object} error - Error details
 * @returns {boolean} Always returns false
 */
const sendError = (res, status, { code, message, details }) => {
  if (!res || typeof res.status !== 'function') {
    throw new Error(message);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      code
    },
    ...(details && { details }),
    timestamp: new Date().toISOString()
  });

  return false;
};

/**
 * Main authentication function
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
const authenticate = async (req, res) => {
  // Extract API key from headers
  const apiKey = getHeader(req, 'x-rapidapi-key') ||
                 getHeader(req, 'x-api-key');

  if (!apiKey) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.MISSING_API_KEY,
      message: 'API key is required. Please provide X-RapidAPI-Key or X-API-Key header.'
    });
  }

  // Verify API key
  let verification;
  try {
    verification = await verifyRapidAPI(req);
  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.INVALID_API_KEY,
      message: error?.message || 'Unable to validate API key.',
      details: { cause: 'verification_failed' }
    });
  }

  if (!verification || !verification.apiKey) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.INVALID_API_KEY,
      message: 'Invalid API key provided.'
    });
  }

  // Resolve plan and limits
  const { plan, limits } = resolvePlanLimits(verification.plan);

  // Check rate limits
  const rateLimitPayload = {
    apiKey: verification.apiKey || apiKey,
    plan,
    limits,
    user: verification.user,
    request: {
      method: req?.method,
      url: req?.url,
      headers: req?.headers
    }
  };

  const rateLimitResult = await checkRateLimit(rateLimitPayload);

  if (rateLimitResult === false) {
    return sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded. Please upgrade your plan or try again later.',
      details: {
        plan,
        limits: {
          perHour: limits.requests_per_hour,
          perDay: limits.requests_per_day
        }
      }
    });
  }

  // Attach user info to request
  req.user = {
    apiKey: verification.apiKey || apiKey,
    plan,
    limits,
    ...(verification.user && {
      id: verification.user.id,
      email: verification.user.email
    })
  };

  return true;
};

/**
 * Authentication middleware wrapper
 * @param {Function} handler - Route handler
 * @returns {Function} Wrapped handler
 */
const authMiddleware = (handler) => async (req, res) => {
  const authResult = await authenticate(req, res);
  
  if (!authResult) {
    // Response already sent by authenticate()
    return;
  }
  
  return handler(req, res);
};

/**
 * Optional authentication middleware
 * Tries to authenticate but doesn't fail if no key provided
 * @param {Function} handler - Route handler
 * @returns {Function} Wrapped handler
 */
const optionalAuth = (handler) => async (req, res) => {
  const apiKey = getHeader(req, 'x-rapidapi-key') ||
                 getHeader(req, 'x-api-key');
  
  if (apiKey) {
    try {
      const verification = await verifyRapidAPI(req);
      if (verification?.apiKey) {
        const { plan, limits } = resolvePlanLimits(verification.plan);
        req.user = {
          apiKey: verification.apiKey,
          plan,
          limits,
          ...(verification.user && {
            id: verification.user.id,
            email: verification.user.email
          })
        };
      }
    } catch (error) {
      // Silently fail - authentication is optional
      console.warn('Optional auth failed:', error.message);
    }
  }
  
  return handler(req, res);
};

module.exports = {
  authenticate,
  authMiddleware,
  optionalAuth,
  
  // Utilities (exported for testing)
  getHeader,
  normalizePlan,
  resolvePlanLimits
};