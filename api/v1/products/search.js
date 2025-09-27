// api/v1/products/search.js
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay-api');

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
    const ebay = new eBayAPI({
      appId: process.env.EBAY_APP_ID,
      environment: 'production'
    });
    
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
      url: item.url,
      image: item.image,
      condition: item.condition,
      seller: {
        username: item.seller?.username,
        feedback: item.seller?.feedback,
        rating: item.seller?.positive
      },
      availability: item.availability,
      location: item.location
    }));
    
    res.status(200).json({
      success: true,
      query: {
        keywords,
        filters: { minPrice, maxPrice },
        sortBy
      },
      pagination: {
        total: results.count,
        limit: parseInt(limit),
        returned: formattedResults.length
      },
      results: formattedResults,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});