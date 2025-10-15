// api/index.js - Main API Information Endpoint
// Route: GET /api
// Auth: Public (no authentication required)

const { publicRoute } = require('../lib/middleware');
const { success } = require('../lib/utils/response');

module.exports = publicRoute(async (req, res) => {
  const host = req.headers.host || 'pricedrop-api.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;

  return success(res, {
    message: '🛍️ PriceDropAPI v1.0 - Real-time Price Tracking',
    version: '1.0.0',
    status: 'operational',
    
    rapidapi: {
      available: true,
      marketplace: 'https://rapidapi.com/hub',
      documentation: 'https://rapidapi.com/yourusername/api/pricedrop-api',
      authentication: 'Use X-RapidAPI-Key header'
    },
    
    endpoints: {
      base: {
        url: `${baseUrl}/api`,
        description: 'API information and status (you are here)',
        method: 'GET',
        auth: false
      },
      health: {
        url: `${baseUrl}/api/v1/core/health`,
        description: 'Health check and service status',
        method: 'GET',
        auth: false
      },
      stores: {
        url: `${baseUrl}/api/stores`,
        description: 'List supported stores',
        method: 'GET',
        auth: false
      },
      search: {
        url: `${baseUrl}/api/v1/products/search?keywords={query}&limit={number}`,
        description: 'Search products',
        method: 'GET',
        auth: true
      },
      track: {
        url: `${baseUrl}/api/v1/products/track`,
        description: 'Track product prices',
        method: 'POST',
        auth: true
      },
      compare: {
        url: `${baseUrl}/api/v1/products/compare`,
        description: 'Compare prices across platforms',
        method: 'POST',
        auth: true
      },
      history: {
        url: `${baseUrl}/api/v1/prices/history?product_id={id}`,
        description: 'Get price history',
        method: 'GET',
        auth: true
      },
      alerts: {
        url: `${baseUrl}/api/v1/alerts`,
        description: 'Manage price alerts',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        auth: true
      }
    },
    
    supported_stores: [
      'ebay.com',
      'amazon.com',
      'walmart.com',
      'bestbuy.com',
      'target.com'
    ],
    
    rate_limits: {
      free: '100 requests/month',
      basic: '1,000 requests/month',
      pro: '10,000 requests/month',
      enterprise: 'Custom'
    },
    
    quick_start: {
      step1: 'Subscribe on RapidAPI',
      step2: 'Get your API key from RapidAPI dashboard',
      step3: 'Include X-RapidAPI-Key in request headers',
      step4: 'Start making requests!'
    },
    
    support: {
      email: 'support@pricedrop-api.com',
      documentation: `${baseUrl}/docs`,
      issues: 'https://github.com/Lemagicrach/pricedrop-api/issues'
    }
  });
});