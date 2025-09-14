const { RATE_LIMITS, ERROR_CODES, HTTP_STATUS } = require('../config/constants');
const { validateApiKey } = require('../lib/validators');

async function authenticate(req, res, next) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(HTTP_STATUS.OK).end();
  }
  
  // For RapidAPI, check X-RapidAPI-Key header
  const rapidApiKey = req.headers['x-rapidapi-key'];
  const apiKey = req.headers['x-api-key'] || rapidApiKey;
  
  const validation = validateApiKey(apiKey);
  
  if (!validation.valid) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({ 
      success: false,
      error: validation.error,
      code: validation.code
    });
  }
  
  try {
    // Create user object with plan information
    const user = {
      id: 'demo-user-' + Date.now(),
      plan: validation.plan,
      requests_today: Math.floor(Math.random() * 50), // Mock usage
      api_key: validation.key,
      limits: RATE_LIMITS[validation.plan.toUpperCase()] || RATE_LIMITS.FREE
    };
    
    // Check rate limit
    if (user.requests_today >= user.limits.requests_per_day) {
      return res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({ 
        success: false,
        error: 'Daily rate limit exceeded',
        limit: user.limits.requests_per_day,
        used: user.requests_today,
        plan: user.plan,
        code: ERROR_CODES.RATE_LIMIT_EXCEEDED
      });
    }
    
    // Attach user to request
    req.user = user;
    
    if (next) next();
    return true;
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Authentication error',
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }
}

function requireAuth(req, res, next) {
  return authenticate(req, res, next);
}

function checkPlan(requiredPlan) {
  const planHierarchy = ['free', 'basic', 'pro', 'enterprise'];
  
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required',
        code: ERROR_CODES.MISSING_API_KEY
      });
    }
    
    const userPlanIndex = planHierarchy.indexOf(req.user.plan);
    const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);
    
    if (userPlanIndex < requiredPlanIndex) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: `This feature requires ${requiredPlan} plan or higher`,
        current_plan: req.user.plan,
        required_plan: requiredPlan,
        code: 'INSUFFICIENT_PLAN'
      });
    }
    
    next();
  };
}

module.exports = {
  authenticate,
  requireAuth,
  checkPlan
};

