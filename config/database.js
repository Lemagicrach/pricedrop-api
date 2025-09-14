// Database configuration
module.exports = {
  // Supabase configuration
  supabase: {
    url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
    key: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || 'your-service-key'
  },

  // Database tables
  tables: {
    PRODUCTS: 'products',
    USERS: 'users',
    PRICE_HISTORY: 'price_history',
    ALERTS: 'alerts',
    API_KEYS: 'api_keys'
  },

  // Connection settings
  connection: {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  }
};

