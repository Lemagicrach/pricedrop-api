// api/v1/products/track.js - Track Product Prices
// Route: POST /api/v1/products/track
// Auth: Required

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { 
  validateRequired,
  validateUrl,
  validateNumber,
  validateEmail
} = require('../../../lib/utils/validation');
const { extractProductInfo } = require('../../../services/productScraper');
const { createProduct, updatePrice } = require('../../../services/database');

module.exports = protectedRoute(async (req, res) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return error(res, 'Method not allowed. Use POST.', 405, 'METHOD_NOT_ALLOWED');
  }

  // Validate inputs
  const url = validateRequired(req.body.url, 'url');
  validateUrl(url, 'url');

  const targetPrice = req.body.target_price 
    ? validateNumber(req.body.target_price, 'target_price', { min: 0 })
    : null;

  const email = req.body.user_email 
    ? validateEmail(req.body.user_email, 'user_email')
    : null;

  const notifyOnDrop = req.body.notify_on_drop !== undefined 
    ? Boolean(req.body.notify_on_drop) 
    : true;

  const checkFrequency = validateNumber(
    req.body.check_frequency || 1,
    'check_frequency',
    { min: 1, max: 24, integer: true }
  );

  // Extract store from URL
  const store = extractStoreFromUrl(url);
  if (!store) {
    return error(
      res,
      'Unsupported store. Check /api/stores for supported stores.',
      400,
      'UNSUPPORTED_STORE'
    );
  }

  // Get product information
  const productInfo = await extractProductInfo(url);

  if (!productInfo.success) {
    return error(
      res,
      productInfo.error || 'Failed to fetch product information',
      400,
      'PRODUCT_INFO_FAILED'
    );
  }

  // Create product in database
  const product = await createProduct({
    url,
    platform: store,
    name: productInfo.title,
    current_price: productInfo.price,
    currency: productInfo.currency,
    image_url: productInfo.image,
    in_stock: productInfo.in_stock,
    user_id: req.user.id,
    created_at: new Date().toISOString(),
    last_checked: new Date().toISOString()
  });

  // Create tracking configuration
  const tracking = {
    tracking_id: `${store}-${product.id}`,
    product_id: product.id,
    url,
    platform: store,
    status: 'active'
  };

  // Add to price history
  await updatePrice(product.id, {
    price: productInfo.price,
    timestamp: new Date().toISOString(),
    in_stock: productInfo.in_stock
  });

  // Calculate insights
  const insights = calculatePriceInsights(productInfo);

  return success(res, {
    message: 'Product tracking initiated successfully',
    tracking,
    product: {
      id: product.id,
      name: productInfo.title,
      current_price: productInfo.price,
      currency: productInfo.currency,
      in_stock: productInfo.in_stock,
      image_url: productInfo.image
    },
    alerts: {
      enabled: notifyOnDrop && targetPrice !== null,
      target_price: targetPrice,
      email: email,
      check_frequency: `Every ${checkFrequency} hour(s)`
    },
    insights,
    next_check: calculateNextCheck(checkFrequency)
  }, 201);
});

// Helper functions
function extractStoreFromUrl(url) {
  const storeMap = {
    'ebay.com': 'ebay',
    'amazon.com': 'amazon',
    'walmart.com': 'walmart',
    'bestbuy.com': 'bestbuy',
    'target.com': 'target'
  };

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    for (const [key, value] of Object.entries(storeMap)) {
      if (domain.includes(key)) return value;
    }
    return null;
  } catch {
    return null;
  }
}

function calculatePriceInsights(productInfo) {
  const insights = {
    price_status: 'stable',
    recommendation: 'monitor',
    savings: null
  };

  if (productInfo.original_price && productInfo.price < productInfo.original_price) {
    const savings = productInfo.original_price - productInfo.price;
    const savingsPercent = ((savings / productInfo.original_price) * 100).toFixed(1);
    
    insights.savings = {
      amount: savings.toFixed(2),
      percentage: `${savingsPercent}%`
    };
    
    if (savingsPercent > 30) {
      insights.price_status = 'excellent_deal';
      insights.recommendation = 'buy_now';
    } else if (savingsPercent > 15) {
      insights.price_status = 'good_deal';
      insights.recommendation = 'consider_buying';
    } else {
      insights.price_status = 'minor_discount';
      insights.recommendation = 'wait_for_better';
    }
  }

  return insights;
}

function calculateNextCheck(frequency) {
  const interval = frequency * 60 * 60 * 1000; // hours to milliseconds
  return new Date(Date.now() + interval).toISOString();
}