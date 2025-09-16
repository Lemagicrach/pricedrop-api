const requestCounts = new Map();

function getRateLimiter(limits = { perMinute: 10, perDay: 100 }) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;
    
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    const recentRequests = requests.filter(time => time > minuteAgo);
    const dailyRequests = requests.filter(time => time > dayAgo);
    
    if (recentRequests.length >= limits.perMinute) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded - max 10 requests per minute',
        retryAfter: 60
      });
    }
    
    if (dailyRequests.length >= limits.perDay) {
      return res.status(429).json({
        success: false,
        error: 'Daily limit exceeded - max 100 requests per day',
        retryAfter: 86400
      });
    }
    
    requests.push(now);
    requestCounts.set(ip, dailyRequests.concat([now]));
    
    next();
  };
}

module.exports = { getRateLimiter };