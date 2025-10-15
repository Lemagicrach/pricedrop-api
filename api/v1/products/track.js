// api/v1/products/track.js - Real product tracking with database integration
const { withCORS, validateRapidAPI } = require('../../../lib/middleware');
const { extractProductInfo } = require('../../../services/productScraper');
const { createProduct, updatePrice } = require('../../../services/database');
const { sendNotification } = require('../../../services/notifications');

module.exports = withCORS(validateRapidAPI(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { 
      url, 
      target_price, 
      notify_on_drop = true, 
      email,
      webhook_url,
      check_frequency = '1h' 
    } = req.body;

    // Validate required fields
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Product URL is required'
      });
    }

    // Extract store from URL
    const store = extractStoreFromUrl(url);
    if (!store) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported store. Check /api/stores for supported stores.'
      });
    }

    // Get current product information
    const productInfo = await extractProductInfo(url);
    
    if (!productInfo.success) {
      return res.status(400).json({
        success: false,
        error: productInfo.error || 'Failed to fetch product information'
      });
    }

    // Create or update product in database
    const product = await createProduct({
      url: url,
      store: store,
      title: productInfo.title,
      current_price: productInfo.price,
      original_price: productInfo.original_price || productInfo.price,
      currency: productInfo.currency,
      image_url: productInfo.image,
      sku: productInfo.sku,
      in_stock: productInfo.in_stock,
      target_price: target_price,
      notify_on_drop: notify_on_drop,
      email: email,
      webhook_url: webhook_url,
      check_frequency: check_frequency,
      last_checked: new Date().toISOString(),
      created_at: new Date().toISOString()
    });

    // Add to price history
    await updatePrice(product.id, {
      price: productInfo.price,
      timestamp: new Date().toISOString(),
      in_stock: productInfo.in_stock
    });

    // Check if we should send an alert
    if (target_price && productInfo.price <= target_price) {
      await sendNotification({
        type: 'price_drop',
        product: product,
        current_price: productInfo.price,
        target_price: target_price,
        email: email,
        webhook_url: webhook_url
      });
    }

    // Calculate price insights
    const insights = calculatePriceInsights(productInfo);

    res.status(201).json({
      success: true,
      message: 'Product tracking initiated successfully',
      data: {
        tracking_id: product.id,
        product: {
          url: url,
          store: store,
          title: productInfo.title,
          sku: productInfo.sku,
          current_price: productInfo.price,
          original_price: productInfo.original_price,
          currency: productInfo.currency,
          discount: productInfo.discount,
          in_stock: productInfo.in_stock,
          image_url: productInfo.image,
          rating: productInfo.rating,
          review_count: productInfo.review_count
        },
        tracking_config: {
          target_price: target_price,
          notify_on_drop: notify_on_drop,
          check_frequency: check_frequency,
          notification_channels: {
            email: !!email,
            webhook: !!webhook_url,
            api: true
          }
        },
        insights: insights,
        meta: {
          created_at: product.created_at,
          last_checked: product.last_checked,
          next_check: calculateNextCheck(check_frequency),
          price_history_url: `/api/v1/prices/history/${product.id}`
        }
      }
    });

  } catch (error) {
    console.error('Track product error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to track product',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Helper functions
function extractStoreFromUrl(url) {
  const storeMap = {
    'amazon.com': 'amazon',
    'amazon.co.uk': 'amazon_uk',
    'ebay.com': 'ebay',
    'bestbuy.com': 'bestbuy',
    'walmart.com': 'walmart',
    'target.com': 'target',
    'newegg.com': 'newegg'
  };

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    for (const [key, value] of Object.entries(storeMap)) {
      if (domain.includes(key)) {
        return value;
      }
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
    savings: null,
    price_trend: 'unknown'
  };

  if (productInfo.original_price && productInfo.price < productInfo.original_price) {
    const savings = productInfo.original_price - productInfo.price;
    const savingsPercent = ((savings / productInfo.original_price) * 100).toFixed(1);
    
    insights.savings = {
      amount: savings.toFixed(2),
      percentage: savingsPercent
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
  const intervals = {
    '15m': 15 * 60 * 1000,
    '30m': 30 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '12h': 12 * 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000
  };
  
  const interval = intervals[frequency] || intervals['1h'];
  return new Date(Date.now() + interval).toISOString();
}