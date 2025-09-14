const { z } = require('zod');

// Import the same list from scraper
const { getSupportedStores } = require('./scraper');

const priceCheckSchema = z.object({
  url: z.string().url().refine(
    (url) => {
      // Use the same stores as scraper.js
      const supportedStores = ['amazon.com', 'ebay.com', 'walmart.com', 'target.com', 'bestbuy.com'];
      return supportedStores.some(store => url.includes(store));
    },
    {
      message: "URL must be from a supported store (Amazon, eBay, Walmart, Target, BestBuy)"
    }
  )
});

// ... rest of your validators

// Track product request schema
const trackProductSchema = z.object({
  url: urlSchema,
  target_price: z.number().positive().optional(),
  notify_on_drop: z.boolean().default(false),
  email: z.string().email().optional()
});


// Alert creation schema
const createAlertSchema = z.object({
  product_id: z.string().uuid(),
  target_price: z.number().positive(),
  notify_email: z.string().email().optional(),
  notify_webhook: z.string().url().optional()
});

// Pagination schema
const paginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0)
});

// Product ID schema
const productIdSchema = z.string().uuid();

function validateRequest(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    };
  }
}

function validateUrl(url) {
  try {
    new URL(url);
    return isUrlSupported(url);
  } catch {
    return false;
  }
}

function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateApiKey(apiKey) {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required',
      code: ERROR_CODES.MISSING_API_KEY
    };
  }

  // Simple plan detection based on key pattern
  let plan = 'free';
  if (apiKey.includes('enterprise')) {
    plan = 'enterprise';
  } else if (apiKey.includes('pro')) {
    plan = 'pro';
  } else if (apiKey.includes('basic')) {
    plan = 'basic';
  }

  return {
    valid: true,
    plan: plan,
    key: apiKey
  };
}

module.exports = {
  // Schemas
  urlSchema,
  trackProductSchema,
  priceCheckSchema,
  createAlertSchema,
  paginationSchema,
  productIdSchema,
  
  // Validation functions
  validateRequest,
  validateUrl,
  validateApiKey,
  sanitizeString,
  isValidEmail
};

