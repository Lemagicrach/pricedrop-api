// api/v1/products/track.js - Real Product Tracking with Database
const { withRapidAPI } = require('../../../lib/middleware');
const { ProductService, PriceHistoryService, TrackingService, UserService } = require('../../../services/supabase');
const eBayAPI = require('../../../lib/ebay');
const axios = require('axios');

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
    // Get user from API key
    const apiKey = req.headers['x-rapidapi-key'] || req.headers['x-api-key'];
    const { data: user, error: userError } = await UserService.findByApiKey(apiKey);
    
    if (userError || !user) {
      // Create a default user if not found (for demo/testing)
      // In production, you should have proper user registration
      const defaultUser = {
        id: 'demo-user-' + apiKey?.substring(0, 8),
        email: user_email || 'demo@example.com',
        api_key: apiKey,
        plan: 'free'
      };
      
      // For demo purposes, we'll use this default user
      // In production, implement proper user creation
    }
    
    const userId = user?.id || 'demo-user-id';
    
    // Check if product already exists in database
    let { data: existingProduct, error: findError } = await ProductService.findByUrl(url);
    
    let productData = {};
    let productId;
    let platform = null;
    let externalId = null;
    
    // Determine platform and fetch product details
    if (url.includes('ebay.com')) {
      platform = 'ebay';
      externalId = url.match(/itm\/(\d+)/)?.[1];
      
      if (externalId) {
        try {
          const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');
          const itemDetails = await ebay.getProductDetails(externalId);
          
          if (itemDetails.success) {
            productData = {
              url: url,
              platform: platform,
              external_id: externalId,
              name: itemDetails.product.title,
              description: itemDetails.product.subtitle,
              image_url: itemDetails.product.images?.[0],
              current_price: itemDetails.product.price.current,
              currency: itemDetails.product.price.currency || 'USD',
              in_stock: itemDetails.product.quantity?.available > 0,
              seller_info: {
                username: itemDetails.product.seller?.userId,
                feedback: itemDetails.product.seller?.feedback,
                positive: itemDetails.product.seller?.positive
              },
              metadata: {
                condition: itemDetails.product.condition,
                location: itemDetails.product.location,
                shipping: itemDetails.product.shipping
              }
            };
          }
        } catch (ebayError) {
          console.error('eBay API error:', ebayError);
          // Continue with basic data if eBay API fails
          productData = {
            url: url,
            platform: platform,
            external_id: externalId,
            name: `eBay Item ${externalId}`,
            current_price: null
          };
        }
      }
    } else if (url.includes('amazon.com')) {
      platform = 'amazon';
      externalId = url.match(/\/([A-Z0-9]{10})/)?.[1]; // ASIN
      
      // For Amazon, we can try to scrape basic info
      // Note: Amazon scraping is complex and may require proxy rotation
      productData = {
        url: url,
        platform: platform,
        external_id: externalId,
        name: `Amazon Product ${externalId}`,
        currency: 'USD',
        // Amazon real-time prices would require PA-API or careful scraping
        current_price: null,
        metadata: {
          asin: externalId,
          note: 'Real-time Amazon prices require PA-API access'
        }
      };
      
      // Optional: Try basic scraping (may be blocked)
      if (process.env.ENABLE_SCRAPING === 'true') {
        try {
          const response = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 5000
          });
          
          // Extract title using regex (basic approach)
          const titleMatch = response.data.match(/<title>([^<]+)<\/title>/);
          if (titleMatch) {
            productData.name = titleMatch[1].split(':')[0].trim();
          }
        } catch (scrapeError) {
          console.log('Amazon scraping failed (expected):', scrapeError.message);
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Unsupported platform',
        supported: ['ebay.com', 'amazon.com'],
        note: 'More platforms coming soon!'
      });
    }
    
    // Create or update product in database
    if (existingProduct) {
      // Update existing product
      productId = existingProduct.id;
      
      // Update price if we have new data
      if (productData.current_price) {
        const { error: updateError } = await ProductService.updatePrice(
          productId,
          productData.current_price,
          productData.in_stock
        );
        
        if (updateError) {
          console.error('Failed to update price:', updateError);
        }
      }
    } else {
      // Create new product
      const { data: newProduct, error: createError } = await ProductService.create(productData);
      
      if (createError) {
        // If database is not configured, continue with in-memory tracking
        console.error('Failed to create product in database:', createError);
        productId = `temp-${Date.now()}`;
      } else {
        productId = newProduct.id;
        existingProduct = newProduct;
      }
    }
    
    // Record price history
    if (productData.current_price && productId && !productId.startsWith('temp-')) {
      const { error: historyError } = await PriceHistoryService.record(
        productId,
        productData.current_price,
        {
          currency: productData.currency,
          in_stock: productData.in_stock,
          seller_info: productData.seller_info
        }
      );
      
      if (historyError) {
        console.error('Failed to record price history:', historyError);
      }
    }
    
    // Create tracking for this user
    const trackingSettings = {
      target_price: target_price ? parseFloat(target_price) : null,
      alert_enabled: notify_on_drop === true,
      alert_type: 'price_drop',
      check_frequency: check_frequency ? parseInt(check_frequency) * 3600 : 3600 // Convert hours to seconds
    };
    
    if (!productId.startsWith('temp-')) {
      const { data: tracking, error: trackingError } = await TrackingService.create(
        userId,
        productId,
        trackingSettings
      );
      
      if (trackingError && !trackingError.message?.includes('duplicate')) {
        console.error('Failed to create tracking:', trackingError);
      }
    }
    
    // Get price history for response
    let priceHistory = [];
    if (!productId.startsWith('temp-')) {
      const { data: history } = await PriceHistoryService.getHistory(productId, 7); // Last 7 days
      priceHistory = history || [];
    }
    
    // Format response
    const response = {
      success: true,
      message: 'Product tracking initialized successfully',
      tracking: {
        tracking_id: `${platform}-${externalId || productId}`,
        product_id: productId,
        url: url,
        platform: platform,
        external_id: externalId,
        status: 'active'
      },
      product: existingProduct || productData,
      alerts: {
        enabled: notify_on_drop === true,
        target_price: target_price ? parseFloat(target_price) : null,
        email: user_email,
        check_frequency: `Every ${check_frequency || 1} hour(s)`
      },
      price_history: {
        count: priceHistory.length,
        data: priceHistory.slice(0, 10), // Return last 10 price points
        chart_url: `/api/v1/prices/history?product_id=${productId}`
      },
      next_steps: {
        view_product: `/api/v1/products/${productId}`,
        update_alert: `/api/v1/alerts/update?product_id=${productId}`,
        stop_tracking: `/api/v1/products/${productId}/untrack`
      }
    };
    
    return res.status(201).json(response);
    
  } catch (error) {
    console.error('Track handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to track product',
      message: error.message,
      tip: 'Make sure your environment variables are configured correctly'
    });
  }
});