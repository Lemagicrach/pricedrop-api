// api/stores.js - List Supported Stores
// Route: GET /api/stores
// Auth: Public

const { publicRoute } = require('../lib/middleware');
const { success } = require('../lib/utils/response');
const { getSupportedStores, getStoreConfig } = require('../lib/scraper');
const { SUPPORTED_STORES } = require('../config/constants');

module.exports = publicRoute(async (req, res) => {
  const supportedStores = getSupportedStores();
  
  // Build detailed store information
  const stores = supportedStores.map(domain => {
    const config = getStoreConfig(domain);
    
    return {
      domain,
      name: config?.name || domain,
      currency: config?.currency || 'USD',
      country: domain.includes('.uk') ? 'UK' : 
               domain.includes('.de') ? 'DE' :
               domain.includes('.ca') ? 'CA' : 'US',
      supported_features: {
        price_tracking: true,
        price_history: true,
        price_alerts: true,
        real_time_pricing: true,
        image_extraction: true,
        availability_check: true
      },
      status: 'operational',
      example_url: getExampleUrl(domain)
    };
  });
  
  return success(res, {
    stores,
    total: stores.length,
    categories: ['E-commerce', 'Electronics', 'General Retail'],
    regions: ['US', 'UK', 'DE', 'CA'],
    last_updated: new Date().toISOString()
  });
});

/**
 * Get example URL for a store
 */
function getExampleUrl(domain) {
  const examples = {
    'ebay.com': 'https://www.ebay.com/itm/123456789',
    'amazon.com': 'https://www.amazon.com/dp/B08N5WRWNW',
    'walmart.com': 'https://www.walmart.com/ip/123456789',
    'bestbuy.com': 'https://www.bestbuy.com/site/123456789',
    'target.com': 'https://www.target.com/p/A-123456789'
  };
  
  return examples[domain] || `https://www.${domain}/product/example`;
}