// api/v1/products/compare.js - Cross-platform product price comparison
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay');

// Instantiate the eBay API client using production credentials when available
const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');

// Helper to calculate the average price from eBay listings
const calculateAverage = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  const prices = items
    .map(item => {
      if (item?.price == null) return null;
      if (typeof item.price === 'number') return item.price;
      if (typeof item.price?.value !== 'undefined') {
        const value = parseFloat(item.price.value);
        return Number.isNaN(value) ? null : value;
      }
      if (typeof item.price?.amount !== 'undefined') {
        const value = parseFloat(item.price.amount);
        return Number.isNaN(value) ? null : value;
      }
      return null;
    })
    .filter(price => typeof price === 'number' && !Number.isNaN(price));

  if (prices.length === 0) {
    return null;
  }

  const total = prices.reduce((sum, value) => sum + value, 0);
  return Number((total / prices.length).toFixed(2));
};

module.exports = withRapidAPI(async (req, res) => {
  const { product, limit: limitParam } = req.body || {};
  const limit = Number.isInteger(limitParam) ? limitParam : parseInt(limitParam, 10) || 5;

  if (!product) {
    return res.status(400).json({
      success: false,
      error: 'Product name or keywords are required',
      code: 'MISSING_PRODUCT'
    });
  }

  try {
    const ebayResults = await ebay.searchProducts(product, limit);
    const ebayItems = Array.isArray(ebayResults?.items) ? ebayResults.items : [];
    const firstItem = ebayItems[0];
    const averagePrice = calculateAverage(ebayItems);

    const ebayComparison = {
      platform: 'ebay',
      available: ebayItems.length > 0,
      totalResults: ebayResults?.count || ebayItems.length,
      environment: ebayResults?.environment || 'production',
      lowest: ebayItems.length > 0
        ? {
          price: typeof firstItem?.price?.value !== 'undefined'
            ? parseFloat(firstItem.price.value)
            : (typeof firstItem?.price === 'number' ? firstItem.price : null),
          currency: firstItem?.price?.currency || 'USD',
          url: firstItem?.url || null
        }
        : null,
      averagePrice,
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
      message: ebayItems.length > 0
        ? null
        : (ebayResults?.error || 'No eBay listings found for this query')
    };

    const response = {
      success: true,
      product: {
        query: product,
        limit,
        marketplace: 'comparison'
      },
      comparison: {
        ebay: ebayComparison,
        amazon: {
          platform: 'amazon',
          available: false,
          note: 'Amazon price data requires PA-API access',
          searchUrl: `https://amazon.com/s?k=${encodeURIComponent(product)}&tag=your-tag`
        }
      },
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Comparison error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to compare product prices',
      message: error.message
    });
  }
});
