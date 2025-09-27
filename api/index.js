// api/v1/index.js - Main API documentation
const { withCORS } = require('../../lib/middleware');

module.exports = withCORS(async (req, res) => {
  const host = req.headers.host || 'your-api.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  res.status(200).json({
    success: true,
    message: '🎉 PriceDrop API v1.0 - Ready for RapidAPI!',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    
    rapidapi: {
      configured: true,
      headers_required: ['X-RapidAPI-Key', 'X-RapidAPI-Host'],
      test_endpoint: `${baseUrl}/api/v1/core/health`
    },
    
    endpoints: {
      // Core endpoints
      health: {
        path: '/api/v1/core/health',
        method: 'GET',
        description: 'Health check endpoint',
        auth_required: false
      },
      status: {
        path: '/api/v1/core/status',
        method: 'GET',
        description: 'Service status and metrics',
        auth_required: false
      },
      
      // Product endpoints
      product_search: {
        path: '/api/v1/products/search',
        method: 'GET',
        params: '?keywords=laptop&limit=10',
        description: 'Search products across platforms',
        auth_required: true
      },
      product_track: {
        path: '/api/v1/products/track',
        method: 'POST',
        body: { url: 'product_url', target_price: 199.99 },
        description: 'Track product prices',
        auth_required: true
      },
      product_compare: {
        path: '/api/v1/products/compare',
        method: 'POST',
        body: { keywords: 'product name' },
        description: 'Compare prices across platforms',
        auth_required: true
      },
      
      // Price endpoints
      price_check: {
        path: '/api/v1/prices/check',
        method: 'POST',
        body: { url: 'product_url' },
        description: 'Check current price',
        auth_required: true
      },
      price_history: {
        path: '/api/v1/prices/history',
        method: 'GET',
        params: '?product_id=123&days=30',
        description: 'Get price history',
        auth_required: true
      },
      
      // Affiliate endpoints
      affiliate_generate: {
        path: '/api/v1/affiliate/generate',
        method: 'POST',
        body: { urls: ['url1', 'url2'] },
        description: 'Generate affiliate links',
        auth_required: true
      }
    },
    
    documentation: {
      rapidapi: 'https://rapidapi.com/pricedrop/api/pricedrop',
      github: 'https://github.com/yourusername/pricedrop-api',
      postman: `${baseUrl}/api/v1/core/docs`
    }
  });
});