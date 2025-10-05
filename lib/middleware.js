// lib/middleware.js - Proper RapidAPI authentication middleware
const rateLimit = require('express-rate-limit');

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
  
  return handler(req, res);
};

// RapidAPI authentication middleware
const validateRapidAPI = (handler) => async (req, res) => {
  try {
    // RapidAPI sends these headers
    const rapidApiKey = req.headers['x-rapidapi-key'];
    const rapidApiHost = req.headers['x-rapidapi-host'];
    const rapidApiProxy = req.headers['x-rapidapi-proxy-secret'];
    
    // In production, RapidAPI proxy adds the proxy-secret header
    // In testing/development, we check for API key
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction) {
      // Verify the request is coming through RapidAPI proxy
      if (rapidApiProxy !== process.env.RAPIDAPI_PROXY_SECRET) {
        return res.status(403).json({
          success: false,
          error: 'Invalid proxy authentication',
          message: 'This API must be accessed through RapidAPI'
        });
      }
    } else {
      // Development/testing mode - just check for API key
      if (!rapidApiKey) {
        return res.status(401).json({
          success: false,
          error: 'Missing RapidAPI authentication',
          message: 'X-RapidAPI-Key header is required',
          documentation: 'https://rapidapi.com/yourusername/api/pricedrop-api'
        });
      }
    }
    
    // Log API usage (for analytics)
    if (process.env.ENABLE_ANALYTICS === 'true') {
      logApiUsage({
        endpoint: req.url,
        method: req.method,
        apiKey: rapidApiKey ? rapidApiKey.substring(0, 8) + '...' : 'unknown',
        timestamp: new Date().toISOString()
      });
    }
    
    // Add user context to request
    req.rapidapi = {
      key: rapidApiKey,
      host: rapidApiHost,
      authenticated: true
    };
    
    return handler(req, res);
  } catch (error) {
    console.error('Middleware error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
};

// Rate limiting per API key
const createRateLimiter = (limits = {}) => {
  const limiters = {};
  
  // Create different limiters for different plans
  const plans = {
    free: { windowMs: 24 * 60 * 60 * 1000, max: 100 },
    basic: { windowMs: 24 * 60 * 60 * 1000, max: 1000 },
    pro: { windowMs: 24 * 60 * 60 * 1000, max: 10000 },
    ultra: { windowMs: 24 * 60 * 60 * 1000, max: 50000 },
    ...limits
  };
  
  return (req, res, next) => {
    // Get user's plan from RapidAPI headers or default to free
    const plan = req.headers['x-rapidapi-subscription'] || 'free';
    const apiKey = req.headers['x-rapidapi-key'] || 'anonymous';
    
    // Create limiter for this plan if it doesn't exist
    if (!limiters[plan]) {
      limiters[plan] = rateLimit({
        windowMs: plans[plan]?.windowMs || plans.free.windowMs,
        max: plans[plan]?.max || plans.free.max,
        keyGenerator: (req) => req.headers['x-rapidapi-key'] || req.ip,
        handler: (req, res) => {
          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: `You have exceeded the ${plans[plan]?.max || 100} requests per day limit`,
            upgrade: 'https://rapidapi.com/yourusername/api/pricedrop-api/pricing'
          });
        }
      });
    }
    
    return limiters[plan](req, res, next);
  };
};

// Error handling middleware
const withErrorHandling = (handler) => async (req, res) => {
  try {
    return await handler(req, res);
  } catch (error) {
    console.error('Handler error:', error);
    
    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV === 'development';
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: isDev ? error.message : 'An unexpected error occurred',
      reference: generateErrorReference()
    });
  }
};

// Request validation middleware
const validateRequest = (schema) => (handler) => async (req, res) => {
  try {
    // Validate request body/query based on schema
    const errors = [];
    
    if (schema.body) {
      for (const [field, rules] of Object.entries(schema.body)) {
        if (rules.required && !req.body[field]) {
          errors.push(`Missing required field: ${field}`);
        }
        if (rules.type && typeof req.body[field] !== rules.type) {
          errors.push(`Invalid type for ${field}: expected ${rules.type}`);
        }
        if (rules.pattern && !rules.pattern.test(req.body[field])) {
          errors.push(`Invalid format for ${field}`);
        }
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        errors: errors
      });
    }
    
    return handler(req, res);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid request'
    });
  }
};

// Helper functions
function logApiUsage(data) {
  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Send to your analytics service
    console.log('API Usage:', data);
  }
}

function generateErrorReference() {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
