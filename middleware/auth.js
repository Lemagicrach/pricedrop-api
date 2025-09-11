const { getUserByApiKey, incrementRequests } = require('../utils/database');

const RATE_LIMITS = {
  free: 100,
  starter: 5000,
  growth: 20000,
  scale: 100000
};

async function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'Missing API key. Add X-API-Key header.' 
    });
  }
  
  const { data: user, error } = await getUserByApiKey(apiKey);
  
  if (error || !user) {
    return res.status(401).json({ 
      error: 'Invalid API key' 
    });
  }
  
  // Check rate limit
  if (user.requests_today >= RATE_LIMITS[user.plan]) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded',
      limit: RATE_LIMITS[user.plan],
      used: user.requests_today,
      plan: user.plan
    });
  }
  
  // Increment request count
  await incrementRequests(user.id);
  
  // Attach user to request
  req.user = user;
  next();
}

module.exports = { authenticate };