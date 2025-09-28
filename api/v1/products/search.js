// api/v1/products/search.js
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay');

module.exports = withRapidAPI(async (req, res) => {
  const { 
    keywords, 
    limit = 20, 
    minPrice, 
    maxPrice, 
    sortBy = 'relevance' 
  } = req.query;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter is required',
      code: 'MISSING_KEYWORDS'
    });
  }
  
  try {
    // Initialize eBay API
    const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');
    
    // Build filters
    const filters = {};
    if (minPrice) filters.minPrice = minPrice;
    if (maxPrice) filters.maxPrice = maxPrice;
    
    // Search products
    const results = await ebay.searchProducts(keywords, limit, {
      sortOrder: sortBy,
      filters: filters
    });
    
    if (!results.success) {
      throw new Error(results.error || 'Search failed');
    }
    
    // Format response
    const formattedResults = results.items.map(item => ({
      id: item.itemId,
      title: item.title,
      price: {
        current: item.price.value,
        currency: item.price.currency,
        shipping: item.shipping?.cost || 0
      },
     }) 
    );
  }
});

