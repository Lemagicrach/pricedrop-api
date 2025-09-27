// api/v1/products/track.js - Product price tracking
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay-api');

// In-memory storage (replace with database in production)
const trackedProducts = new Map();
const priceHistory = new Map();

module.exports = withRapidAPI(async (req, res) => {
  const { 
    url,                // Product URL to track
    target_price,       // Target price for alerts
    notify_on_drop,     // Enable notifications
    check_frequency,    // How often to check (hours)
    user_email         // Email for notifications
  } = req.body;
  
  // Validate required parameters
  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'Product URL is required',
      code: 'MISSING_URL'
    });
  }
  
  try {
    // Extract product info from URL
    let productId = null;
    let platform = null;
    let productData = {};
    
    if (url.includes('ebay.com')) {
      platform = 'ebay';
      productId = url.match(/itm\/(\d+)/)?.[1];
      
      if (!productId) {
        productId = url.match(/item\/(\d+)/)?.[1];
      }
      
      // Fetch current price from eBay
      const ebay = new eBayAPI({
        appId: process.env.EBAY_APP_ID,
        environment: 'production'
      });
      
      // Get item details
      try {
        const itemDetails = await ebay.getItemDetails(productId);
        if (itemDetails.success) {
          productData = {
            title: itemDetails.item.title,
            current_price: itemDetails.item.price.value,
            currency: itemDetails.item.price.currency,
            image: itemDetails.item.image,
            seller: itemDetails.item.seller
          };
        }
      } catch (error) {
        console.log('Could not fetch eBay details, using URL only');
      }
      
    } else if (url.includes('amazon.com')) {
      platform = 'amazon';
      productId = url.match(/\/([A-Z0-9]{10})/)?.[1]; // ASIN
      
      // Amazon requires PA-API for prices
      productData = {
        title: 'Amazon Product',
        current_price: null,
        currency: 'USD',
        note: 'Real-time Amazon prices require PA-API access'
      };
      
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform',
        supported: ['ebay.com', 'amazon.com']
      });
    }
    
    // Generate unique tracking ID
    const trackingId = `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create tracking record
    const trackingRecord = {
      id: trackingId,
      product_id: productId,
      platform: platform,
      url: url,
      target_price: target_price || null,
      notify_on_drop: notify_on_drop || false,
      check_frequency: check_frequency || 24, // Default 24 hours
      user_email: user_email || null,
      created_at: new Date().toISOString(),
      last_checked: new Date().toISOString(),
      next_check: new Date(Date.now() + (check_frequency || 24) * 3600000).toISOString(),
      status: 'active',
      product_data: productData,
      price_history: []
    };
    
    // Add initial price to history if available
    if (productData.current_price) {
      trackingRecord.price_history.push({
        price: productData.current_price,
        timestamp: new Date().toISOString()
      });
    }
    
    // Store tracking record (in production, use database)
    trackedProducts.set(trackingId, trackingRecord);
    
    // Store in price history
    if (!priceHistory.has(productId)) {
      priceHistory.set(productId, []);
    }
    priceHistory.get(productId).push({
      price: productData.current_price,
      timestamp: new Date().toISOString()
    });
    
    // Return response
    res.status(201).json({
      success: true,
      message: 'Product tracking started successfully',
      tracking: {
        id: trackingId,
        url: url,
        platform: platform,
        product: productData,
        target_price: target_price,
        notify_on_drop: notify_on_drop,
        check_frequency: `Every ${check_frequency} hours`,
        next_check: trackingRecord.next_check,
        status: 'active'
      },
      links: {
        check_status: `/api/v1/products/track/${trackingId}`,
        price_history: `/api/v1/prices/history?tracking_id=${trackingId}`,
        update_settings: `/api/v1/products/track/${trackingId}`,
        stop_tracking: `/api/v1/products/track/${trackingId}`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Tracking error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start tracking',
      message: error.message
    });
  }
});

// Helper function to check prices periodically (would run as a cron job)
async function checkTrackedPrices() {
  for (const [trackingId, record] of trackedProducts) {
    if (record.status !== 'active') continue;
    
    const nextCheckTime = new Date(record.next_check);
    if (nextCheckTime > new Date()) continue;
    
    // Check price based on platform
    if (record.platform === 'ebay') {
      // Fetch current price from eBay
      // Update price history
      // Check if price dropped below target
      // Send notification if needed
    }
    
    // Update next check time
    record.last_checked = new Date().toISOString();
    record.next_check = new Date(Date.now() + record.check_frequency * 3600000).toISOString();
  }
}