// lib/middleware/auth.js - Updated to use secure key system
const { verifyApiKey, incrementCredits } = require('../security/apiKeys');
const { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } = require('../../config/constants');
const { checkRateLimit } = require('../../services/rateLimiter');

/**
 * Helper to read headers in a case-insensitive way
 */
const getHeader = (req, name) => {
  if (!req || !req.headers || !name) return undefined;
  return req.headers[name.toLowerCase()] || req.headers[name];
};

/**
 * Extract API key from headers
 */
const getApiKey = (req) => {
  const raw = getHeader(req, 'x-rapidapi-key') ||
              getHeader(req, 'x-api-key') ||
              getHeader(req, 'authorization');
  return raw ? String(raw).replace(/^Bearer\s+/i, '') : undefined;
};

/**
 * Normalize plan name and resolve limits
 */
const normalizePlan = (plan) => {
  if (!plan) return 'FREE';
  return String(plan).toUpperCase();
};

const resolvePlanLimits = (plan) => {
  const normalized = normalizePlan(plan);
  return {
    plan: normalized,
    limits: RATE_LIMITS[normalized] || RATE_LIMITS.FREE
  };
};

/**
 * Send error response
 */
const sendError = (res, status, { code, message }) => {
  res.status(status).json({
    success: false,
    error: { message, code },
    timestamp: new Date().toISOString()
  });
  return false;
};

/**
 * Main authentication function
 */
const authenticate = async (req, res) => {
  const apiKey = getApiKey(req);
  
  if (!apiKey) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.MISSING_API_KEY,
      message: 'API key required. Include X-RapidAPI-Key or X-API-Key header.'
    });
  }
  
  // Verify key using secure system
  const verification = await verifyApiKey(apiKey);
  
  if (!verification || !verification.valid) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: verification?.code || ERROR_CODES.INVALID_API_KEY,
      message: verification?.error || 'Invalid API key'
    });
  }
  
  // Resolve plan and limits
  const { plan, limits } = resolvePlanLimits(verification.user?.plan || verification.plan);
  
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
  
  // Increment credits (async, don't wait)
  if (req.user.id) {
    incrementCredits(req.user.id).catch(err => 
      console.error('Failed to increment credits:', err)
    );
  }
    // Check rate limits
  const rateLimitResult = await checkRateLimit(req.user.id, limits);
  
  if (!rateLimitResult.allowed) {
    return sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded',
      details: {
        counts: rateLimitResult.counts,
        limits: rateLimitResult.limits,
        reset: rateLimitResult.reset
      }
    });
  }
  
  // Add rate limit info to response headers
  res.setHeader('X-RateLimit-Limit-Hour', limits.requests_per_hour);
  res.setHeader('X-RateLimit-Remaining-Hour', 
    limits.requests_per_hour - rateLimitResult.counts.hour);
  res.setHeader('X-RateLimit-Reset-Hour', rateLimitResult.reset.hour);
  
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
  const apiKey = getHeader(req, 'x-rapidapi-key') || getHeader(req, 'x-api-key') || getHeader(req, 'authorization');
  if (apiKey) {
    try {
      const verification = await verifyApiKey(apiKey);
      if (verification && verification.valid) {
        const { plan, limits } = resolvePlanLimits(verification.user?.plan || verification.plan);
        req.user = {
          apiKey: verification.apiKey || apiKey,
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
      console.warn('Optional auth failed:', error?.message || error);
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