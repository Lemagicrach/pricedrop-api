// lib/middleware.js - Critical for RapidAPI
const withCORS = (handler) => {
  return async (req, res) => {
    // Set CORS headers for RapidAPI
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-RapidAPI-Key,X-RapidAPI-Host,Content-Type,Authorization'
    );
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    // Continue to handler
    return handler(req, res);
  };
};

const withRapidAPI = (handler, options = {}) => {
  return withCORS(async (req, res) => {
    // Extract RapidAPI headers
    const rapidApiKey = req.headers['x-rapidapi-key'];
    const rapidApiHost = req.headers['x-rapidapi-host'];
    
    // Skip auth for health and docs endpoints
    if (options.skipAuth) {
      return handler(req, res);
    }
    
    // Validate RapidAPI headers
    if (!rapidApiKey || !rapidApiHost) {
      return res.status(401).json({
        success: false,
        error: 'Missing RapidAPI authentication headers',
        code: 'UNAUTHORIZED',
        headers: {
          required: ['X-RapidAPI-Key', 'X-RapidAPI-Host'],
          received: {
            'X-RapidAPI-Key': rapidApiKey ? 'present' : 'missing',
            'X-RapidAPI-Host': rapidApiHost ? 'present' : 'missing'
          }
        }
      });
    }
    
    // Add auth context to request
    req.auth = {
      apiKey: rapidApiKey,
      host: rapidApiHost,
      isAuthenticated: true
    };
    
    // Call the actual handler
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  });
};

module.exports = { withCORS, withRapidAPI };