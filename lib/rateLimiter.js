// lib/rateLimiter.js - Rate Limiter with Memory Cleanup
// Last updated: 2025-01-15

const requestCounts = new Map();
const CLEANUP_INTERVAL = 3600000; // 1 hour in milliseconds
const MAX_TRACKED_IPS = 10000; // Safety limit

/**
 * Periodic cleanup to prevent memory leaks
 * Runs every hour to remove old request data
 */
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  const dayAgo = now - 86400000;
  let cleaned = 0;
  
  for (const [ip, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(time => time > dayAgo);
    
    if (recentRequests.length === 0) {
      requestCounts.delete(ip);
      cleaned++;
    } else {
      requestCounts.set(ip, recentRequests);
    }
  }
  
  console.log(`[Rate Limiter] Cleanup: Removed ${cleaned} IPs, tracking ${requestCounts.size} IPs`);
  
  // Safety check: if too many IPs tracked, clear oldest half
  if (requestCounts.size > MAX_TRACKED_IPS) {
    const entries = Array.from(requestCounts.entries());
    entries.sort((a, b) => {
      const aLatest = Math.max(...a[1]);
      const bLatest = Math.max(...b[1]);
      return aLatest - bLatest;
    });
    
    const toRemove = entries.slice(0, Math.floor(entries.length / 2));
    toRemove.forEach(([ip]) => requestCounts.delete(ip));
    
    console.warn(`[Rate Limiter] Emergency cleanup: Removed ${toRemove.length} oldest IPs`);
  }
}, CLEANUP_INTERVAL);

/**
 * Get rate limiter middleware
 * @param {Object} limits - Rate limit configuration
 * @param {number} limits.perMinute - Max requests per minute
 * @param {number} limits.perDay - Max requests per day
 * @returns {Function} Middleware function
 */
function getRateLimiter(limits = { perMinute: 10, perDay: 100 }) {
  return (req, res, next) => {
    // Extract IP address with multiple fallbacks
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.socket?.remoteAddress ||
               'unknown';
    
    const now = Date.now();
    const minuteAgo = now - 60000;
    const dayAgo = now - 86400000;
    
    // Initialize tracking for this IP
    if (!requestCounts.has(ip)) {
      requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    
    // Filter to get only recent requests
    const recentRequests = requests.filter(time => time > minuteAgo);
    const dailyRequests = requests.filter(time => time > dayAgo);
    
    // Check per-minute limit
    if (limits.perMinute && recentRequests.length >= limits.perMinute) {
      const retryAfter = 60 - Math.floor((now - Math.min(...recentRequests)) / 1000);
      
      return res.status(429).json({
        success: false,
        error: `Rate limit exceeded - maximum ${limits.perMinute} requests per minute`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.max(retryAfter, 1),
        limit: {
          perMinute: limits.perMinute,
          current: recentRequests.length
        }
      });
    }
    
    // Check per-day limit
    if (limits.perDay && dailyRequests.length >= limits.perDay) {
      const oldestRequest = Math.min(...dailyRequests);
      const retryAfter = Math.ceil((oldestRequest + 86400000 - now) / 1000);
      
      return res.status(429).json({
        success: false,
        error: `Daily limit exceeded - maximum ${limits.perDay} requests per day`,
        code: 'DAILY_LIMIT_EXCEEDED',
        retryAfter: Math.max(retryAfter, 1),
        limit: {
          perDay: limits.perDay,
          current: dailyRequests.length
        }
      });
    }
    
    // Add current request timestamp
    // Keep only requests from the last 24 hours to prevent array bloat
    requestCounts.set(ip, [...dailyRequests, now]);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit-Minute', limits.perMinute || 'unlimited');
    res.setHeader('X-RateLimit-Remaining-Minute', limits.perMinute ? Math.max(0, limits.perMinute - recentRequests.length - 1) : 'unlimited');
    res.setHeader('X-RateLimit-Limit-Day', limits.perDay || 'unlimited');
    res.setHeader('X-RateLimit-Remaining-Day', limits.perDay ? Math.max(0, limits.perDay - dailyRequests.length - 1) : 'unlimited');
    
    // Continue to next middleware
    if (typeof next === 'function') {
      next();
    }
  };
}

/**
 * Clear all rate limit data (useful for testing)
 */
function clearRateLimits() {
  requestCounts.clear();
  console.log('[Rate Limiter] All rate limit data cleared');
}

/**
 * Get current rate limit stats
 * @returns {Object} Statistics
 */
function getStats() {
  const now = Date.now();
  const dayAgo = now - 86400000;
  
  let totalRequests = 0;
  let activeIPs = 0;
  
  for (const [ip, requests] of requestCounts.entries()) {
    const recentRequests = requests.filter(time => time > dayAgo);
    if (recentRequests.length > 0) {
      activeIPs++;
      totalRequests += recentRequests.length;
    }
  }
  
  return {
    trackedIPs: requestCounts.size,
    activeIPsLast24h: activeIPs,
    totalRequestsLast24h: totalRequests,
    memoryUsage: `${(requestCounts.size * 100 / 1024).toFixed(2)} KB (estimated)`
  };
}

/**
 * Stop the cleanup interval (for graceful shutdown)
 */
function stopCleanup() {
  clearInterval(cleanupInterval);
  console.log('[Rate Limiter] Cleanup interval stopped');
}

module.exports = {
  getRateLimiter,
  clearRateLimits,
  getStats,
  stopCleanup
};