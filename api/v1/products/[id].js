// api/v1/products/[id].js - Dynamic product details
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay');

module.exports = withRapidAPI(async (req, res) => {
  // Extract ID from URL path
  const productId = req.query.id || req.url.split('/').pop();
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      error: 'Product ID is required'
    });
  }
  
  try {
    // Initialize eBay API
    
    const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');

    // Get product details
    const details = await ebay.getProductDetails(productId);
    
    if (!details.success) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        product_id: productId
      });
    }
    
    // Format response with additional insights
    const productTitle = details.product.title || '';

    const response = {
      success: true,
      product: {
        id: productId,
        ...details.product,
        insights: {
          price_competitiveness: calculatePriceCompetitiveness(details.product),
          demand_level: calculateDemandLevel(details.product),
          seller_reliability: calculateSellerReliability(details.product),
          best_time_to_buy: suggestBestTimeToBuy(details.product)
        },
        affiliate_links: {
          ebay: generateEbayAffiliateLink(details.product.url || `https://www.ebay.com/itm/${productId}`),
          comparison: `/api/v1/products/compare?keywords=${encodeURIComponent(productTitle)}`
        },
        related_endpoints: {
          track: `/api/v1/products/track`,
          history: `/api/v1/prices/history?product_id=${productId}`,
          similar: `/api/v1/products/search?keywords=${encodeURIComponent(productTitle)}`
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('Product details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product details',
      message: error.message
    });
  }
});

// Helper functions
function calculatePriceCompetitiveness(item) {
  // Logic to determine if price is competitive
  return 'competitive';
}

function calculateDemandLevel(item) {
  const watchers = item.watchers || 0 }
