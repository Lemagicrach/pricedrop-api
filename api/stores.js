const { getSupportedStores } = require('../lib/scraper');
const { SUPPORTED_STORES, HTTP_STATUS, ERROR_CODES } = require('../config/constants');

module.exports = function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');
  
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
    
    // Build detailed store information from config
    const stores = supportedStores.map(domain => {
      const storeConfig = SUPPORTED_STORES[domain];
      return {
        domain,
        name: storeConfig.name,
        currency: storeConfig.currency,
        supported_features: {
          price_tracking: true,
          image_extraction: true,
          availability_check: true,
          real_time_pricing: true
        }
      };
    });
    
    res.status(HTTP_STATUS.OK).json({
      success: true,
      data: {
        stores,
        total: stores.length,
        last_updated: new Date().toISOString()
      },
      meta: {
        total_supported: stores.length,
        categories: ['E-commerce', 'Electronics', 'General Retail'],
        regions: ['US', 'UK']
      }
    });
    
  } catch (error) {
    console.error('Stores endpoint error:', error);
    
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Internal server error',
      code: ERROR_CODES.INTERNAL_ERROR
    });
  }
};

