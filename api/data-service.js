// api/data-service.js - Global monetization without geographic restrictions
const eBayAPIEnhanced = require('../lib/ebay');
const { validateApiKey } = require('../lib/validators');

// Initialize eBay API
const ebay = new eBayAPIEnhanced();

// Credit costs for different operations
const CREDIT_COSTS = {
  'search': 1,
  'product_details': 2,
  'price_history': 5,
  'bulk_search': 10,
  'market_analysis': 20,
  'competitor_tracking': 15,
  'export_data': 25
};

// Subscription tiers (works globally via RapidAPI or direct payments)
const SUBSCRIPTION_TIERS = {
  free: {
    credits: 100,
    rate_limit: 1, // requests per second
    price: 0
  },
  starter: {
    credits: 1000,  },
}
