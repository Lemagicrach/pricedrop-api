// api/v1/products/search.js - Search Products
// Route: GET /api/v1/products/search?keywords={query}&limit={number}
// Auth: Required

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { validateString, validateNumber, validateEnum } = require('../../../lib/utils/validation');
const eBayAPI = require('../../../lib/ebay');

module.exports = protectedRoute(async (req, res) => {
  // Validate inputs
  const keywords = validateString(req.query.keywords, 'keywords', { minLength: 1 });
  const limit = validateNumber(req.query.limit || 20, 'limit', { 
    min: 1, 
    max: 100, 
    integer: true 
  });
  
  const sortBy = req.query.sortBy 
    ? validateEnum(req.query.sortBy, 'sortBy', ['relevance', 'price', 'newest'])
    : 'relevance';

  // Optional price filters
  const filters = {};
  if (req.query.minPrice) {
    filters.minPrice = validateNumber(req.query.minPrice, 'minPrice', { min: 0 });
  }
  if (req.query.maxPrice) {
    filters.maxPrice = validateNumber(req.query.maxPrice, 'maxPrice', { min: 0 });
  }

  // Validate price range
  if (filters.minPrice && filters.maxPrice && filters.minPrice > filters.maxPrice) {
    return error(res, 'minPrice cannot be greater than maxPrice', 400, 'INVALID_PRICE_RANGE');
  }

  // Initialize eBay API
  const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');
  
  // Check if eBay is configured
  if (!ebay.isConfigured()) {
    return error(
      res,
      'eBay API not configured. Please contact support.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // Search products
  const results = await ebay.searchProducts(keywords, limit, {
    sortOrder: sortBy,
    filters
  });

  if (!results.success) {
    return error(res, results.error || 'Search failed', 502, 'SEARCH_FAILED');
  }

  // Format items
  const items = results.items.map(item => ({
    id: item.itemId,
    title: item.title,
    price: {
      current: item.price.value,
      currency: item.price.currency,
      shipping: item.shipping?.cost || 0
    },
    url: item.url,
    image: item.image,
    condition: item.condition,
    seller: item.seller,
    listing: item.listing,
    location: item.location
  }));

  return success(res, {
    query: {
      keywords,
      limit,
      sortBy,
      filters
    },
    count: items.length,
    totalResults: results.totalEntries || items.length,
    items
  });
});