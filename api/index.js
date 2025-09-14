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
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: `${baseUrl}/api/health`,
      stores: `${baseUrl}/api/stores`,
      price_check: `${baseUrl}/api/price-check`,
      track: `${baseUrl}/api/track`
    },
    features: {
      supported_stores: ['amazon.com', 'amazon.co.uk', 'bestbuy.com', 'walmart.com', 'target.com'],
      real_time_pricing: true,
      price_tracking: true,
      email_alerts: true,
      api_rate_limiting: true
    },
    documentation: 'https://github.com/Lemagicrach/pricedrop-api',
    support: 'https://rapidapi.com/pricedrop/api/pricedrop'
  });
};

