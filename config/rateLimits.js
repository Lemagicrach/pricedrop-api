// config/rateLimits.js - Centralized rate limit configuration
module.exports = {
  // Rate limits matching documentation exactly
  RATE_LIMITS: {
    BASIC: {
      requests_per_month: 100,
      requests_per_day: Math.ceil(100 / 30), // ~3 per day
      requests_per_minute: 10,
      concurrent_tracks: 0, // No tracking on free tier
      price_history_days: 0,
      check_frequency: null // No automated checks
    },
    PRO: {
      requests_per_month: 1000,
      requests_per_day: Math.ceil(1000 / 30), // ~33 per day  
      requests_per_minute: 30,
      concurrent_tracks: 25,
      price_history_days: 30,
      check_frequency: 15 // 15 minutes
    },
    ULTRA: {
      requests_per_month: 10000,
      requests_per_day: Math.ceil(10000 / 30), // ~333 per day
      requests_per_minute: 100,
      concurrent_tracks: 100,
      price_history_days: 90,
      check_frequency: 5 // 5 minutes
    },
    MEGA: {
      requests_per_month: 50000,
      requests_per_day: Math.ceil(50000 / 30), // ~1666 per day
      requests_per_minute: 500,
      concurrent_tracks: 500,
      price_history_days: -1, // Unlimited
      check_frequency: 1 // 1 minute
    }
  },
  
  // Overage pricing (per request)
  OVERAGE_PRICING: {
    BASIC: null, // No overages, hard limit
    PRO: 0.03,
    ULTRA: 0.008,
    MEGA: 0.003
  },
  
  // Helper function to get limits for a plan
  getLimitsForPlan(plan) {
    const normalizedPlan = (plan || 'BASIC').toUpperCase();
    return this.RATE_LIMITS[normalizedPlan] || this.RATE_LIMITS.BASIC;
  },
  
  // Check if plan allows overages
  allowsOverages(plan) {
    const normalizedPlan = (plan || 'BASIC').toUpperCase();
    return this.OVERAGE_PRICING[normalizedPlan] !== null;
  }
};