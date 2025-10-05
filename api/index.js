// api/index.js - FIXED main API endpoint
const { withCORS } = require('../lib/middleware');

// Using withCORS instead of withRapidAPI for the main info endpoint
// This endpoint should be publicly accessible for API discovery
module.exports = withCORS(async (req, res) => {
  try {
    const host = req.headers.host || 'pricedrop-api.vercel.app';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const baseUrl = `${protocol}://${host}`;
    
    res.status(200).json({
      success: true,
      message: '🛍️ PriceDropAPI v1.0 - Real-time Price Tracking',
      version: '1.0.0',
      status: 'operational',
      timestamp: new Date().toISOString(),
      
      rapidapi: {
        available: true,
        subscribe: 'https://rapidapi.com/yourusername/api/pricedrop-api',
        documentation: 'https://rapidapi.com/yourusername/api/pricedrop-api/details',
        authentication: 'Use X-RapidAPI-Key header'
      },
      
      endpoints: {
        base: {
          current: `${baseUrl}/api`,
          description: 'API information and status'
        },
        track: {
          url: `${baseUrl}/api/v1/products/track`,
          method: 'POST',
          description: 'Track a product from supported stores',
          requires_auth: true
        },
        price_check: {
          url: `${baseUrl}/api/v1/prices/check`,
          method: 'GET',
          description: 'Check current price of a product',
          requires_auth: true
        },
        price_history: {
          url: `${baseUrl}/api/v1/prices/history`,
          method: 'GET',
          description: 'Get price history for a product',
          requires_auth: true
        },
        stores: {
          url: `${baseUrl}/api/stores`,
          method: 'GET',
          description: 'Get list of supported stores',
          requires_auth: false
        }
      },
      
      supported_stores: [
        'ebay.com',
        'ebay.co.uk',
        'ebay.de'
      ],
      
      rate_limits: {
        free: '100 requests/day',
        basic: '1,000 requests/day',
        pro: '10,000 requests/day'
      },
      
      quick_start: {
        step1: 'Subscribe on RapidAPI',
        step2: 'Get your API key',
        step3: 'Include X-RapidAPI-Key in headers',
        step4: 'Start tracking products!'
      },
      
      support: {
        email: 'support@pricedrop-api.com',
        documentation: `${baseUrl}/docs`,
        issues: 'https://github.com/yourusername/pricedrop-api/issues'
      }
    });
  } catch (error) {
    console.error('API Index Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'The API encountered an error. Please try again later.'
    });
  }
});