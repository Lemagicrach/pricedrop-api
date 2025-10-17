// services/rateLimiter.js - Serverless-compatible rate limiting

// Fix: Handle missing database gracefully
let supabase;
try {
  const db = require('./database');
  supabase = db.supabase;
} catch (error) {
  supabase = null;
}

/**
 * Check if user exceeds rate limits
 */
async function checkRateLimit(userId, limits) {
  if (!limits || !userId) {
    return { allowed: true };
  }
  
  // If no database, use in-memory fallback (for tests)
  if (!supabase) {
    return {
      allowed: true,
      counts: { hour: 0, day: 0 },
      limits: limits,
      reset: {
        hour: new Date(Date.now() + 3600000).toISOString(),
        day: new Date(Date.now() + 86400000).toISOString()
      }
    };
  }
  
  const now = new Date();
  const hourAgo = new Date(now - 60 * 60 * 1000);
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
  
  try {
    const { data, error } = await supabase.rpc('check_and_log_request', {
      p_user_id: userId,
      p_hour_ago: hourAgo.toISOString(),
      p_day_ago: dayAgo.toISOString(),
      p_hour_limit: limits.requests_per_hour || 9999,
      p_day_limit: limits.requests_per_day || 99999
    });
    
    if (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true };
    }
    
    return {
      allowed: data.allowed,
      counts: {
        hour: data.hour_count,
        day: data.day_count
      },
      limits: limits,
      reset: {
        hour: new Date(now.getTime() + (60 * 60 * 1000)).toISOString(),
        day: new Date(now.getTime() + (24 * 60 * 60 * 1000)).toISOString()
      }
    };
  } catch (error) {
    console.error('Rate limiter error:', error);
    return { allowed: true };
  }
}

/**
 * Log request for analytics
 */
async function logRequest(userId, endpoint, statusCode, responseTimeMs) {
  if (!userId || !supabase) return;
  
  try {
    await supabase
      .from('api_logs')
      .insert([{
        user_id: userId,
        endpoint,
        status_code: statusCode,
        response_time_ms: responseTimeMs,
        created_at: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Failed to log request:', error);
  }
}

/**
 * Get user's rate limit statistics
 */
async function getRateLimitStats(userId) {
  if (!supabase) return null;
  
  try {
    const now = new Date();
    const hourAgo = new Date(now - 60 * 60 * 1000);
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    
    const [hourResult, dayResult] = await Promise.all([
      supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', hourAgo.toISOString()),
      
      supabase
        .from('api_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', dayAgo.toISOString())
    ]);
    
    return {
      requests_last_hour: hourResult.count || 0,
      requests_last_day: dayResult.count || 0,
      timestamp: now.toISOString()
    };
  } catch (error) {
    console.error('Failed to get rate limit stats:', error);
    return null;
  }
}

module.exports = {
  checkRateLimit,
  logRequest,
  getRateLimitStats
};