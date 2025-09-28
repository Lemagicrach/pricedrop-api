// api/search-all.js
const eBayAPIEnhanced = require('../lib/ebay');

module.exports = async (req, res) => {
  const { keywords } = req.query;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter is required',
      code: 'MISSING_KEYWORDS'
    });
  }

  const ebay = new eBayAPIEnhanced();

  try {
    const ebayResults = await ebay.searchProducts(keywords, 5);

    if (!ebayResults?.success) {
      return res.status(502).json({
        success: false,
        error: 'Failed to fetch eBay results',
        source: 'ebay',
        details: ebayResults?.error || 'Unknown error'
      });
    }

    const amazonLink = `https://amazon.com/s?k=${encodeURIComponent(keywords)}&tag=${process.env.AMAZON_TAG}`;

    return res.json({
      success: true,
      query: keywords,
      ebay: {
        count: ebayResults.count || (Array.isArray(ebayResults.items) ? ebayResults.items.length : 0),
        items: ebayResults.items
      },
      amazon: {
        searchLink: amazonLink,
        note: 'Direct API access requires PA-API approval'
      }
    });
  } catch (error) {
    console.error('search-all error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};