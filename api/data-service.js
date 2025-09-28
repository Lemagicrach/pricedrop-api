// api/data-service.js - Global monetization without geographic restrictions
const eBayAPIEnhanced = require('../lib/ebay');
const { validateApiKey } = require('../lib/validators');

// Initialize eBay API
const ebay = new eBayAPIEnhanced();

// Credit costs for different operations
const CREDIT_COSTS = {
  search: 1,
  product_details: 2,
  price_history: 5,
  bulk_search: 10,
  market_analysis: 20,
  competitor_tracking: 15,
  export_data: 25
};

// Subscription tiers (works globally via RapidAPI or direct payments)
const SUBSCRIPTION_TIERS = {
  free: {
    credits: 100,
    rate_limit: 1, // requests per second
    price: 0
  },
  starter: {
    credits: 1000,
    rate_limit: 5, // requests per second
    price: 29,
    features: [
      'Access to all free tier features',
      'Increased rate limits',
      'Bulk search support'
    ]
  }
};

const formatError = (status, message) => ({
  status,
  body: {
    success: false,
    message
  }
});

const ACTION_HANDLERS = {
  async search(params) {
    const { keywords, limit, ...options } = params;
    if (!keywords) {
      throw formatError(400, 'Missing required parameter: keywords');
    }
    const parsedLimit = Number.parseInt(limit, 10) || 10;
    return ebay.searchProducts(keywords, parsedLimit, options);
  },

  async product_details(params) {
    const { itemId } = params;
    if (!itemId) {
      throw formatError(400, 'Missing required parameter: itemId');
    }
    return ebay.getProductDetails(itemId);
  },

  async bulk_search(params) {
    const { queries } = params;
    if (!Array.isArray(queries) || queries.length === 0) {
      throw formatError(400, 'queries must be a non-empty array');
    }

    const responses = await Promise.all(
      queries.map(query =>
        ebay.searchProducts(query.keywords, query.limit || 10, query.options || {})
      )
    );

    return {
      success: true,
      results: responses
    };
  }
};

const sendResponse = (res, status, payload) => {
  res.status(status).json(payload);
};

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!['GET', 'POST'].includes(req.method)) {
    return sendResponse(res, 405, { success: false, message: 'Method not allowed' });
  }

  const { action, ...params } = req.method === 'GET' ? (req.query || {}) : (req.body || {});

  if (!action) {
    return sendResponse(res, 400, { success: false, message: 'Missing action parameter' });
  }

  if (action === 'tiers') {
    return sendResponse(res, 200, { success: true, tiers: SUBSCRIPTION_TIERS });
  }

  const apiKey = req.headers['x-rapidapi-key'] || req.headers['x-api-key'];
  const validation = validateApiKey(apiKey);

  if (!validation.valid) {
    return sendResponse(res, 401, {
      success: false,
      message: 'A valid API key is required for this action'
    });
  }

  const handler = ACTION_HANDLERS[action];

  if (!handler) {
    return sendResponse(res, 400, { success: false, message: `Unsupported action: ${action}` });
  }

  try {
    const data = await handler(params);
    return sendResponse(res, 200, {
      success: true,
      action,
      tier: validation.tier,
      credits_used: CREDIT_COSTS[action] || 0,
      data
    });
  } catch (error) {
    if (error && error.status && error.body) {
      return sendResponse(res, error.status, error.body);
    }

    return sendResponse(res, 500, {
      success: false,
      message: error?.message || 'Unknown server error'
    });
  }
};

module.exports.CREDIT_COSTS = CREDIT_COSTS;
module.exports.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
