// api/monetize.js - Complete monetization endpoint
const eBayAPIEnhanced = require('../lib/ebay');
const AmazonAffiliateAPI = require('../lib/amazonAffiliate');
const { validateApiKey } = require('../lib/validators');

// Initialize APIs
const defaultDeps = {
  ebay: new eBayAPIEnhanced(),
  amazon: new AmazonAffiliateAPI()
};

class MonetizeError extends Error {
  constructor(message, { status = 500, code = 'MONETIZE_ERROR', details = null } = {}) {
    super(message);
    this.name = 'MonetizeError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const buildActionHandlers = ({ ebay, amazon }) => ({
  'ebay:search': async ({ keywords, limit, ...options }) => {
    if (!keywords) {
      throw new MonetizeError('Missing required parameter: keywords', {
        status: 400,
        code: 'MISSING_KEYWORDS'
      });
    }

    const searchLimit = limit !== undefined ? Number(limit) : undefined;
    if (searchLimit !== undefined && (!Number.isFinite(searchLimit) || searchLimit <= 0)) {
      throw new MonetizeError('The limit parameter must be a positive number', {
        status: 400,
        code: 'INVALID_LIMIT'
      });
    }

    const result = await ebay.searchProducts(keywords, searchLimit, options);
    if (!result || result.success === false) {
      throw new MonetizeError(result?.error || 'Failed to search eBay products', {
        status: 502,
        code: 'EBAY_SEARCH_FAILED',
        details: result || null
      });
    }

    return result;
  },

  'ebay:item-details': async ({ itemId }) => {
    if (!itemId) {
      throw new MonetizeError('Missing required parameter: itemId', {
        status: 400,
        code: 'MISSING_ITEM_ID'
      });
    }

    const result = await ebay.getProductDetails(itemId);
    if (!result || result.success === false) {
      throw new MonetizeError(result?.error || 'Failed to fetch eBay item details', {
        status: 502,
        code: 'EBAY_DETAILS_FAILED',
        details: result || { itemId }
      });
    }

    return result;
  },

  'amazon:create-link': async ({ url, ...options }) => {
    if (!url) {
      throw new MonetizeError('Missing required parameter: url', {
        status: 400,
        code: 'MISSING_URL'
      });
    }

    const result = await amazon.createAffiliateLink(url, options);
    if (!result || result.success === false) {
      throw new MonetizeError(result?.error || 'Failed to generate Amazon affiliate link', {
        status: 400,
        code: 'AMAZON_LINK_FAILED',
        details: result || null
      });
    }

    return result;
  },

  'amazon:category-link': async ({ category, region, tag }) => {
    if (!category) {
      throw new MonetizeError('Missing required parameter: category', {
        status: 400,
        code: 'MISSING_CATEGORY'
      });
    }

    const domainRegion = (region || amazon.detectRegion(`https://amazon.com/${category}`)).toUpperCase();
    const domain = amazon.amazonDomains[domainRegion] || amazon.amazonDomains.US;
    return {
      success: true,
      category,
      region: domainRegion,
      affiliateUrl: amazon.generateCategoryLink(category, domain, tag)
    };
  }
});

module.exports = async (req, res, deps = defaultDeps) => {
  const { ebay, amazon } = deps;
  if (!ebay || !amazon) {
    throw new Error('Monetization dependencies are not configured correctly');
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
 
  const payload = req.method === 'GET' ? (req.query || {}) : (req.body || {});
  const { action, ...params } = payload;

  // Validate API key for premium features
  const apiKey = req.headers['x-rapidapi-key'] || req.headers['x-api-key'];
  const validation = validateApiKey(apiKey);  

  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: {
        message: validation.error || 'Invalid API key',
        code: validation.code || 'INVALID_API_KEY'
      }
    });
  }

  if (!action) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Action parameter is required',
        code: 'MISSING_ACTION'
      }
    });
  }

  const handlers = buildActionHandlers({ ebay, amazon });
  const handler = handlers[action];

  if (!handler) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Unsupported action: ${action}`,
        code: 'UNSUPPORTED_ACTION'
      }
    });
  }

  try {
    const data = await handler(params, { plan: validation.plan, key: validation.key });
    return res.status(200).json({
      success: true,
      action,
      plan: validation.plan,
      data
    });
  } catch (error) {
    if (error instanceof MonetizeError) {
      return res.status(error.status).json({
        success: false,
        action,
        error: {
          message: error.message,
          code: error.code,
          details: error.details || undefined
        }
      });
    }

    console.error('Monetization endpoint error:', error);
    return res.status(500).json({
      success: false,
      action,
      error: {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      }
    });
  }
};

module.exports.buildActionHandlers = buildActionHandlers;
module.exports.MonetizeError = MonetizeError;
module.exports.defaultDeps = defaultDeps;