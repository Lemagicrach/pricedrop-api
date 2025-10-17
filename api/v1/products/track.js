// api/v1/products/track.js - Real product tracking with database integration
const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const {
  ValidationError,
  validateUrl,
  validateNumber,
  validateEmail,
  validateBoolean
} = require('../../../lib/utils/validation');
const { extractProductInfo } = require('../../../services/productScraper');
const {
  createProduct,
  updatePrice,
  upsertUserTracking
} = require('../../../services/database');
const { sendNotification } = require('../../../services/notifications');

module.exports = protectedRoute(async (req, res) => {

  if (req.method !== 'POST') {
    return error(res, 'Method not allowed. Use POST.', 405, 'METHOD_NOT_ALLOWED');
  }

    if (!req.user?.id) {
    return error(res, 'Authenticated user record not found', 401, 'UNAUTHORIZED');
  }

  let url;
  let targetPrice = null;
  let email = null;
  let notifyOnDrop = true;
  let checkFrequency = 1;

  try {
    const body = req.body || {};

    url = validateUrl(
      body.url ?? body.product_url ?? body.productUrl,
      'url'
    );

    const targetInput = body.target_price ?? body.targetPrice;
    if (targetInput !== undefined && targetInput !== null && targetInput !== '') {
      targetPrice = validateNumber(targetInput, 'target_price', { min: 0 });
    }

    const emailInput = body.user_email ?? body.email;
    if (emailInput) {
      email = validateEmail(emailInput, 'user_email');
    }

    const notifyInput = body.notify_on_drop ?? body.notifyOnDrop;
    if (notifyInput !== undefined) {
      notifyOnDrop = validateBoolean(notifyInput, 'notify_on_drop', { defaultValue: true });
    }

    const frequencyInput = body.check_frequency ?? body.checkFrequency;
    if (frequencyInput !== undefined && frequencyInput !== null && frequencyInput !== '') {
      checkFrequency = validateNumber(frequencyInput, 'check_frequency', {
        min: 1,
        max: 24,
        integer: true
      });
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    console.error('Track product validation failed:', err);
    return error(res, 'Invalid request payload', 400, 'INVALID_PAYLOAD');
  }
  const store = extractStoreFromUrl(url);
  if (!store) {
    return error(
      res,
      'Unsupported store. Check /api/stores for supported stores.',
      400,
      'UNSUPPORTED_STORE'
    );
  }
  try {
    const productInfo = await extractProductInfo(url);

    if (!productInfo.success) {
      return error(
        res,
        productInfo.error || 'Failed to fetch product information',
        400,
        'PRODUCT_INFO_FAILED'
      );
    }

     const nowIso = new Date().toISOString();
    const currentPrice = typeof productInfo.price === 'number'
      ? productInfo.price
      : Number(productInfo.price);

     const product = await createProduct({
      url,
      platform: store,
      name: productInfo.title,
      current_price: currentPrice,
      currency: productInfo.currency,
      image_url: productInfo.image,
      in_stock: productInfo.in_stock,
      user_id: req.user.id,
      created_at: nowIso,
      last_checked: nowIso
    });

    const trackingRecord = await upsertUserTracking({
      user_id: req.user.id,
      product_id: product.id,
      target_price: targetPrice,
           notify_on_any_drop: notifyOnDrop,
      check_frequency_hours: checkFrequency
    });

    await updatePrice(product.id, {
      price: currentPrice,
      timestamp: nowIso,
      in_stock: productInfo.in_stock,
      currency: productInfo.currency
    });

    const insights = calculatePriceInsights(productInfo);

    if (targetPrice !== null && currentPrice <= targetPrice && email) {
      try {
        await sendNotification({
          type: 'price_drop',
          email,
          product: {
            id: product.id,
            name: productInfo.title,
            url,
            image_url: productInfo.image
          },
          old_price: productInfo.original_price,
          current_price: currentPrice,
          target_price: targetPrice
        });
      } catch (notificationError) {
        console.warn('Failed to send immediate notification:', notificationError);
      }
    }

    return success(res, {
      message: 'Product tracking initiated successfully',
      tracking: {
        id: trackingRecord?.id || `${store}-${product.id}`,
        product_id: product.id,
        url,
        platform: store,
        target_price: targetPrice,
        notify_on_drop: notifyOnDrop,
        check_frequency_hours: checkFrequency,
        status: 'active'
      },
      product: {
        id: product.id,
        name: productInfo.title,
        current_price: currentPrice,
        currency: productInfo.currency,
        in_stock: productInfo.in_stock,
        image_url: productInfo.image
      },
      alerts: {
        enabled: notifyOnDrop,
        target_price: targetPrice,
        email,
        check_frequency: `Every ${checkFrequency} hour(s)`
      },
      insights,
      next_check: calculateNextCheck(checkFrequency)
    }, 201);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }

    console.error('Failed to track product:', err);

    const status = err?.message?.includes('Supabase')
      ? 503
      : 500;

    return error(
      res,
      status === 503
        ? 'Database not configured. Please complete Supabase setup.'
        : 'Failed to initiate product tracking',
      status,
      status === 503 ? 'SERVICE_UNAVAILABLE' : 'TRACKING_FAILED'
    );
  }
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