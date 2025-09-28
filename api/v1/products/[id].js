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
    const watchers = Number(item.watchers || item.listing?.watchers || 0);
  const sold = Number(item.quantity?.sold || 0);
  const available = Number(item.quantity?.available || 0);

  const demandScore = watchers * 2 + sold;

  let level = 'very low';
  if (demandScore >= 150) {
    level = 'surging';
  } else if (demandScore >= 75) {
    level = 'very high';
  } else if (demandScore >= 35) {
    level = 'high';
  } else if (demandScore >= 15) {
    level = 'moderate';
  } else if (demandScore >= 5) {
    level = 'low';
  }

  return {
    level,
    score: demandScore,
    metrics: {
      watchers,
      sold,
      availability: available
    },
    reasoning: `Demand score of ${demandScore} driven by ${watchers} watcher(s) and ${sold} unit(s) sold.`
  };
}

function calculateSellerReliability(item) {
  const feedbackScore = Number(item.seller?.feedback || 0);
  const positivePercent = Number(item.seller?.positive || 0);

  let rating = 'unknown';
  if (positivePercent >= 99 && feedbackScore >= 1000) {
    rating = 'excellent';
  } else if (positivePercent >= 97 && feedbackScore >= 500) {
    rating = 'very good';
  } else if (positivePercent >= 95 && feedbackScore >= 100) {
    rating = 'good';
  } else if (positivePercent > 0) {
    rating = 'developing';
  }

  return {
    rating,
    feedbackScore,
    positivePercent,
    reasoning: positivePercent
      ? `Seller has ${feedbackScore.toLocaleString()} feedback with ${positivePercent}% positive rating.`
      : 'Insufficient feedback data to determine reliability.'
  };
}

function suggestBestTimeToBuy(item) {
  const timeLeft = item.listing?.timeLeft || null;
  const endTime = item.listing?.endTime ? new Date(item.listing.endTime) : null;
  const sold = Number(item.quantity?.sold || 0);
  const available = Number(item.quantity?.available || 0);

  let recommendation = 'Buy when the price meets your target.';

  if (endTime && endTime > new Date()) {
    recommendation = 'Consider purchasing near the listing end time to watch for price drops.';
  }

  if (available > 0 && sold >= available) {
    recommendation = 'Demand is quickly depleting stock—buy soon to secure availability.';
  }

  return {
    recommendation,
    listingEndsAt: endTime ? endTime.toISOString() : null,
    timeLeft,
    context: {
      sold,
      available
    }
  };
}

function generateEbayAffiliateLink(itemUrl, campaignId = process.env.EBAY_CAMPAIGN_ID || '5338736402') {
  if (!itemUrl) {
    return null;
  }

  const roverUrl = 'https://rover.ebay.com/rover/1/711-53200-19255-0/1';
  const params = new URLSearchParams({
    icep_id: '114',
    ipn: 'icep',
    toolid: '20004',
    campid: campaignId,
    customid: '',
    icep_item: extractItemId(itemUrl) || '',
    icep_vectorid: '229466',
    kwid: '902099',
    mtid: '824',
    kw: 'pd'
  });

  return `${roverUrl}?${params.toString()}&mpre=${encodeURIComponent(itemUrl)}`;
}

function extractItemId(url) {
  if (!url) return null;
  const match = url.match(/\/itm\/(\d+)|\/(\d+)(?:\?|$)/);
  return match ? (match[1] || match[2]) : null;
}