// Application constants and configuration
module.exports = {
  // Supported stores configuration
  SUPPORTED_STORES: {
    'amazon.com': { 
      name: 'Amazon US', 
      currency: 'USD',
      selectors: {
        price: '.a-price-whole, .a-offscreen',
        title: '#productTitle',
        image: '#landingImage'
      }
    },
    'amazon.co.uk': { 
      name: 'Amazon UK', 
      currency: 'GBP',
      selectors: {
        price: '.a-price-whole, .a-offscreen',
        title: '#productTitle',
        image: '#landingImage'
      }
    },
    'bestbuy.com': { 
      name: 'Best Buy', 
      currency: 'USD',
      selectors: {
        price: '.sr-only:contains("current price")',
        title: '.sku-title',
        image: '.primary-image'
      }
    },
    'walmart.com': { 
      name: 'Walmart', 
      currency: 'USD',
      selectors: {
        price: '[data-testid="price-current"]',
        title: '[data-testid="product-title"]',
        image: '[data-testid="hero-image"]'
      }
    },
    'target.com': { 
      name: 'Target', 
      currency: 'USD',
      selectors: {
        price: '[data-test="product-price"]',
        title: '[data-test="product-title"]',
        image: '[data-test="hero-image"]'
      }
    }
  },

  // API rate limits by plan
  RATE_LIMITS: {
    FREE: {
      requests_per_hour: 100,
      requests_per_day: 1000,
      concurrent_tracks: 5
    },
    BASIC: {
      requests_per_hour: 500,
      requests_per_day: 5000,
      concurrent_tracks: 25
    },
    PRO: {
      requests_per_hour: 2000,
      requests_per_day: 20000,
      concurrent_tracks: 100
    },
    ENTERPRISE: {
      requests_per_hour: 10000,
      requests_per_day: 100000,
      concurrent_tracks: 500
    }
  },

  // HTTP status codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500
  },

  // Error codes
  ERROR_CODES: {
    MISSING_URL: 'MISSING_URL',
    INVALID_URL: 'INVALID_URL',
    UNSUPPORTED_STORE: 'UNSUPPORTED_STORE',
    MISSING_API_KEY: 'MISSING_API_KEY',
    INVALID_API_KEY: 'INVALID_API_KEY',
    RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    SCRAPING_FAILED: 'SCRAPING_FAILED',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
  },

  // Default values
  DEFAULTS: {
    TIMEOUT: 10000, // 10 seconds
    USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000 // 1 second
  }
};

