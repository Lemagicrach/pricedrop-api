// api/v1/products/[id].js - Dynamic product details
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay-api');

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
    const ebay = new eBayAPI({
      appId: process.env.EBAY_APP_ID,
      environment: 'production'
    });
    
    // Get product details
    const details = await ebay.getItemDetails(productId);
    
    if (!details.success) {
      return res.status(404).json({
        success: false,
        error: 'Product not found',
        product_id: productId
      });
    }
    
    // Format response with additional insights
    const response = {
      success: true,
      product: {
        id: productId,
        ...details.item,
        insights: {
          price_competitiveness: calculatePriceCompetitiveness(details.item),
          demand_level: calculateDemandLevel(details.item),
          seller_reliability: calculateSellerReliability(details.item),
          best_time_to_buy: suggestBestTimeToBuy(details.item)
        },
        affiliate_links: {
          ebay: generateEbayAffiliateLink(details.item.url),
          comparison: `/api/v1/products/compare?keywords=${encodeURIComponent(details.item.title)}`
        },
        related_endpoints: {
          track: `/api/v1/products/track`,
          history: `/api/v1/prices/history?product_id=${productId}`,
          similar: `/api/v1/products/search?keywords=${encodeURIComponent(details.item.title)}`
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
  const watchers = item.watchers || 0;
  if (watchers > 50) return 'high';
  if (watchers > 20) return 'medium';
  return 'low';
}

function calculateSellerReliability(item) {
  const feedback = item.seller?.feedback || 0;
  const positive = item.seller?.positive || 0;
  if (feedback > 1000 && positive > 98) return 'excellent';
  if (feedback > 100 && positive > 95) return 'good';
  return 'fair';
}

function suggestBestTimeToBuy(item) {
  // Simple logic - would be more complex in production
  return 'Prices typically lower on weekends';
}

function generateEbayAffiliateLink(url) {
  // Add your eBay partner network tracking
  return url + '?campid=' + (process.env.EBAY_CAMPAIGN_ID || 'your_campaign_id');
}