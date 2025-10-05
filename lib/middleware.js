// lib/middleware.js - FIXED middleware with proper exports

// CORS middleware
const withCORS = (handler) => async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host, X-RapidAPI-Proxy-Secret');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Continue to handler
  return handler(req, res);
};

// RapidAPI authentication middleware
const withRapidAPI = (handler) => async (req, res) => {
  try {
    // In production, check for RapidAPI headers
    if (process.env.NODE_ENV === 'production' && process.env.RAPIDAPI_PROXY_SECRET) {
      const rapidApiKey = req.headers['x-rapidapi-key'];
      const rapidApiHost = req.headers['x-rapidapi-host'];
      const rapidApiProxy = req.headers['x-rapidapi-proxy-secret'];
      
      // Verify proxy secret (this is how RapidAPI validates the request is coming through them)
      if (rapidApiProxy !== process.env.RAPIDAPI_PROXY_SECRET) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized. Please use RapidAPI to access this API.'
        });
      }
      
      // Check for required headers
      if (!rapidApiKey || !rapidApiHost) {
        return res.status(401).json({
          success: false,
          error: 'Missing RapidAPI authentication headers'
        });
      }
    }
    
    // Continue to handler
    return handler(req, res);
  } catch (error) {
    console.error('Middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Combined middleware (CORS + RapidAPI auth)
const validateRapidAPI = (handler) => withCORS(withRapidAPI(handler));

// Rate limiting (simple in-memory implementation)
const rateLimitMap = new Map();

const withRateLimit = (limit = 100, window = 60000) => (handler) => async (req, res) => {
  const key = req.headers['x-rapidapi-key'] || req.headers['x-forwarded-for'] || 'anonymous';
  const now = Date.now();
  
  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, { count: 1, resetTime: now + window });
  } else {
    const userData = rateLimitMap.get(key);
    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + window;
    } else {
      userData.count++;
      if (userData.count > limit) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((userData.resetTime - now) / 1000)
        });
      }
    }
  }
  
  return handler(req, res);
};

// IMPORTANT: Export all functions
module.exports = {
  withCORS,
  withRapidAPI,
  validateRapidAPI,
  withRateLimit
};