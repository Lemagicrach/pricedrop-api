const { HTTP_STATUS } = require('../config/constants');
const { getSupportedStores } = require('../lib/scraper');

module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(HTTP_STATUS.OK).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(HTTP_STATUS.METHOD_NOT_ALLOWED).json({
      success: false,
      error: 'Method not allowed. Use GET.',
      code: 'METHOD_NOT_ALLOWED'
    });
  }
  
  try {
    const supportedStores = getSupportedStores();
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      service: 'PriceDrop API',
      uptime: process.uptime(),
      features: {
        price_scraping: true,
        product_tracking: true,
        email_notifications: true,
        rate_limiting: true
      },
      supported_stores: {
        count: supportedStores.length,
        stores: supportedStores
      },
      environment: {
        node_version: process.version,
        platform: process.platform,
        memory_usage: process.memoryUsage()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
};

