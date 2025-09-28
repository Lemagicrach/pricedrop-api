// api/v1/products/track.js - Product price tracking
const { withRapidAPI } = require('../../../lib/middleware');
const eBayAPI = require('../../../lib/ebay');

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
      
      const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');

      // Get item details
      try {
        const itemDetails = await ebay.getProductDetails(productId);
        if (itemDetails.success) {
          productData = {
            title: itemDetails.product.title,
            current_price: itemDetails.product.price.current,
            currency: itemDetails.product.price.currency,
            image: itemDetails.product.images?.[0],
            seller: itemDetails.product.seller
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
  }
})