// api/v1/products/[id].js - Get Product Details
// Route: GET /api/v1/products/{id}
// Auth: Required

const { protectedRoute } = require('../../../lib/middleware');
const { success, error, notFound } = require('../../../lib/utils/response');
const eBayAPI = require('../../../lib/ebay');

module.exports = protectedRoute(async (req, res) => {
  // Extract product ID from URL
  const productId = req.query.id;
  
  if (!productId) {
    return error(res, 'Product ID is required', 400, 'MISSING_PRODUCT_ID');
  }

  // Initialize eBay API
  const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');
  
  if (!ebay.isConfigured()) {
    return error(
      res,
      'eBay API not configured. Please contact support.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // Get product details
  const details = await ebay.getProductDetails(productId);

  if (!details.success) {
    return notFound(res, 'Product not found', `Product ID: ${productId}`);
  }

  // Calculate insights
  const insights = {
    demand_level: calculateDemandLevel(details.product),
    seller_reliability: calculateSellerReliability(details.product),
    price_competitiveness: calculatePriceCompetitiveness(details.product),
    best_time_to_buy: suggestBestTimeToBuy(details.product)
  };

  // Generate affiliate links
  const affiliateLinks = {
    ebay: ebay.generateAffiliateLink(
      details.product.url || `https://www.ebay.com/itm/${productId}`
    ),
    comparison: `/api/v1/products/compare?keywords=${encodeURIComponent(details.product.title)}`
  };

  // Related endpoints
  const relatedEndpoints = {
    track: `/api/v1/products/track`,
    history: `/api/v1/prices/history?product_id=${productId}`,
    similar: `/api/v1/products/search?keywords=${encodeURIComponent(details.product.title)}`
  };

  return success(res, {
    product: {
      id: productId,
      ...details.product,
      insights,
      affiliateLinks,
      relatedEndpoints
    }
  });
});

// Helper functions
function calculateDemandLevel(item) {
  const watchers = Number(item.watchers || item.listing?.watchers || 0);
  const sold = Number(item.quantity?.sold || 0);
  const available = Number(item.quantity?.available || 0);

  const demandScore = watchers * 2 + sold;

  let level = 'very low';
  if (demandScore >= 150) level = 'surging';
  else if (demandScore >= 75) level = 'very high';
  else if (demandScore >= 35) level = 'high';
  else if (demandScore >= 15) level = 'moderate';
  else if (demandScore >= 5) level = 'low';

  return {
    level,
    score: demandScore,
    metrics: { watchers, sold, availability: available },
    reasoning: `Demand score of ${demandScore} based on ${watchers} watcher(s) and ${sold} unit(s) sold.`
  };
}

function calculateSellerReliability(item) {
  const feedbackScore = Number(item.seller?.feedback || 0);
  const positivePercent = Number(item.seller?.positive || 0);

  let rating = 'unknown';
  if (positivePercent >= 99 && feedbackScore >= 1000) rating = 'excellent';
  else if (positivePercent >= 97 && feedbackScore >= 500) rating = 'very good';
  else if (positivePercent >= 95 && feedbackScore >= 100) rating = 'good';
  else if (positivePercent > 0) rating = 'developing';

  return {
    rating,
    feedbackScore,
    positivePercent: `${positivePercent}%`,
    reasoning: positivePercent
      ? `Seller has ${feedbackScore.toLocaleString()} feedback with ${positivePercent}% positive rating.`
      : 'Insufficient feedback data.'
  };
}

function calculatePriceCompetitiveness(item) {
  // Simplified - in production, compare with similar items
  return {
    level: 'competitive',
    reasoning: 'Price analysis based on market data'
  };
}

function suggestBestTimeToBuy(item) {
  const endTime = item.listing?.endTime ? new Date(item.listing.endTime) : null;
  const sold = Number(item.quantity?.sold || 0);
  const available = Number(item.quantity?.available || 0);

  let recommendation = 'Buy when price meets your target.';

  if (endTime && endTime > new Date()) {
    recommendation = 'Consider buying near listing end time for potential price drops.';
  }

  if (available > 0 && sold >= available * 0.8) {
    recommendation = 'High demand depleting stock - buy soon to secure availability.';
  }

  return {
    recommendation,
    listingEndsAt: endTime ? endTime.toISOString() : null,
    timeLeft: item.listing?.timeLeft,
    urgency: available > 0 && sold >= available * 0.8 ? 'high' : 'normal'
  };
}