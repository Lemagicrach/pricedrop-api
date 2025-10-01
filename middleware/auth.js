const { verifyRapidAPI, checkRateLimit } = require('../services/rapidapi');
const { RATE_LIMITS, HTTP_STATUS, ERROR_CODES } = require('../config/constants');

const getHeader = (req, name) => {
  if (!req || !req.headers) {
    return undefined;
  }

  const lowerName = name.toLowerCase();
  if (lowerName in req.headers) {
    return req.headers[lowerName];
  }

  return Object.keys(req.headers).reduce((value, key) => {
    if (value) {
      return value;
    }

    if (key.toLowerCase() === lowerName) {
      return req.headers[key];
    }

    return value;
  }, undefined);
};

const normalizePlan = (plan) => {
  if (!plan || typeof plan !== 'string') {
    return 'FREE';
  }
  return plan.trim().toUpperCase();
};

const resolvePlanLimits = (plan) => {
  const normalized = normalizePlan(plan);
  if (RATE_LIMITS[normalized]) {
    return { plan: normalized, limits: RATE_LIMITS[normalized] };
  }

  return { plan: 'FREE', limits: RATE_LIMITS.FREE };
};

const sendError = (res, status, { code, message, details }) => {
  if (!res || typeof res.status !== 'function') {
    throw new Error(message);
  }

  res
    .status(status)
    .json({
      success: false,
      error: message,
      code,
      ...(details ? { details } : {})
    });

  return false;
};

const authenticate = async (req, res) => {
  const apiKey = getHeader(req, 'x-rapidapi-key');

  if (!apiKey) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.MISSING_API_KEY,
      message: 'RapidAPI key is required for this endpoint.'
    });
  }

  let verification;
  try {
    verification = await Promise.resolve(verifyRapidAPI(req));
  } catch (error) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.INVALID_API_KEY,
      message: error?.message || 'Unable to validate RapidAPI key.',
      details: { cause: 'verification_failed' }
    });
  }

  if (!verification || !verification.apiKey) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, {
      code: ERROR_CODES.INVALID_API_KEY,
      message: 'Invalid RapidAPI key provided.'
    });
  }

  const { plan, limits } = resolvePlanLimits(verification.plan);

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

  const rateLimitResult = await Promise.resolve(checkRateLimit(rateLimitPayload));

  if (rateLimitResult === false) {
    return sendError(res, HTTP_STATUS.TOO_MANY_REQUESTS, {
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Rate limit exceeded. Please upgrade your plan or try again later.',
      details: {
        plan,
        limits
      }
    });
  }

  req.user = {
    apiKey: verification.apiKey || apiKey,
    plan,
    limits,
    ...(verification.user ? { id: verification.user.id, email: verification.user.email } : {})
  };

  return true;
};

module.exports = {
  authenticate
};