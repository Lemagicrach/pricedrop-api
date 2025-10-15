// api/v1/products/compare.js - Compare Product Prices
// Route: POST /api/v1/products/compare
// Auth: Required

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { validateRequired, validateNumber } = require('../../../lib/utils/validation');
const eBayAPI = require('../../../lib/ebay');

module.exports = protectedRoute(async (req, res) => {
  // Validate inputs
  const product = validateRequired(req.body.product, 'product');
  const limit = validateNumber(req.body.limit || 10, 'limit', { 
    min: 1, 
    max: 50, 
    integer: true 
  });

  // Initialize eBay API
  const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');

  // Search eBay
  const ebayResults = await ebay.searchProducts(product, limit);
  const ebayItems = Array.isArray(ebayResults?.items) ? ebayResults.items : [];
  
  // Calculate statistics
  const ebayPrices = ebayItems
    .map(item => item.price?.value)
    .filter(price => typeof price === 'number' && price > 0);
  
  const averagePrice = ebayPrices.length > 0
    ? (ebayPrices.reduce((sum, p) => sum + p, 0) / ebayPrices.length).toFixed(2)
    : null;
  
  const lowestPrice = ebayPrices.length > 0 ? Math.min(...ebayPrices) : null;
  const highestPrice = ebayPrices.length > 0 ? Math.max(...ebayPrices) : null;

  // Format eBay comparison
  const ebayComparison = {
    platform: 'ebay',
    available: ebayItems.length > 0,
    totalResults: ebayResults?.count || ebayItems.length,
    statistics: {
      averagePrice,
      lowestPrice,
      highestPrice,
      currency: ebayItems[0]?.price?.currency || 'USD'
    },
    listings: ebayItems.slice(0, limit).map(item => ({
      id: item.itemId,
      title: item.title,
      price: item.price,
      url: item.url,
      image: item.image,
      seller: item.seller,
      condition: item.condition,
      shipping: item.shipping
    })),
    message: ebayItems.length > 0 ? null : 'No eBay listings found for this query'
  };

  // Amazon comparison (affiliate links only)
  const amazonComparison = {
    platform: 'amazon',
    available: false,
    note: 'Amazon price data requires PA-API access',
    searchUrl: `https://amazon.com/s?k=${encodeURIComponent(product)}&tag=${process.env.AMAZON_PARTNER_TAG || 'your-tag-20'}`,
    message: 'Use search URL to browse Amazon listings manually'
  };

  return success(res, {
    query: {
      product,
      limit
    },
    comparison: {
      ebay: ebayComparison,
      amazon: amazonComparison
    },
    summary: {
      platforms_checked: 2,
      platforms_available: ebayItems.length > 0 ? 1 : 0,
      total_listings: ebayItems.length,
      price_range: lowestPrice && highestPrice 
        ? `$${lowestPrice} - $${highestPrice}`
        : 'N/A'
    }
  });
});