const { HTTP_STATUS } = require('../config/constants');

module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(HTTP_STATUS.OK).end();
  }
  
  const host = req.headers.host;
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  res.status(HTTP_STATUS.OK).json({
    success: true,
    message: '🎉 PriceDrop API is Live!',
    status: 'operational',
    version: '1.1.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${baseUrl}/api/health`,
      stores: `${baseUrl}/api/stores`,
      price_check: `${baseUrl}/api/price-check`,
      track: `${baseUrl}/api/track`,
      ebay_search: `${baseUrl}/api/ebay-search`,  // NEW - Working
      amazon_affiliate: `${baseUrl}/api/amazon-affiliate`  // NEW - Working
    },
    current_status: {
      ebay: 'Sandbox API working, Production pending approval',
      amazon: 'Affiliate links only (PA-API requires 3 sales)',
      scraping: 'Disabled - Sites block after 5-10 requests'
    },
    features: {
      ebay_product_search: true,  // Actually works
      amazon_affiliate_links: true,  // Actually works
      real_time_pricing: false,  // Honest - scraping doesn't work
      price_tracking: false,  // Not implemented yet
      email_alerts: false,  // Not implemented yet
      api_rate_limiting: true  // Basic implementation exists
    },
    usage: {
      ebay_search: 'GET /api/ebay-search?keywords=phone&limit=10',
      amazon_link: 'GET /api/amazon-affiliate?keywords=laptop'
    },
    documentation: 'https://github.com/Lemagicrach/pricedrop-api',
    note: 'Currently using eBay Sandbox data. Production access pending.'
  });
};