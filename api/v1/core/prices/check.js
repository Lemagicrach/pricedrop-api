// api/cron/check-prices.js - Scheduled Price Checking
const { ProductService, PriceHistoryService, AlertService } = require('../../services/supabase');
const eBayAPI = require('../../lib/ebay');
const { sendPriceDropEmail } = require('../../services/notifications');

// This endpoint will be called by Vercel Cron or GitHub Actions
module.exports = async (req, res) => {
  // Verify cron secret to prevent unauthorized calls
  const cronSecret = req.headers.authorization?.replace('Bearer ', '');
  
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }
  
  console.log('🔄 Starting scheduled price check...');
  
  const results = {
    checked: 0,
    updated: 0,
    alerts: 0,
    errors: []
  };
  
  try {
    // Get products that need checking
    const { data: products, error } = await ProductService.getProductsToCheck(50);
    
    if (error) {
      throw new Error(`Failed to fetch products: ${error.message}`);
    }
    
    if (!products || products.length === 0) {
      return res.json({
        success: true,
        message: 'No products to check',
        results
      });
    }
    
    // Initialize eBay API
    const ebay = new eBayAPI(process.env.EBAY_APP_ID, 'production');
    
    // Check each product
    for (const product of products) {
      try {
        results.checked++;
        
        let newPrice = null;
        let inStock = true;
        let additionalData = {};
        
        // Fetch current price based on platform
        if (product.platform === 'ebay' && product.external_id) {
          try {
            const itemDetails = await ebay.getProductDetails(product.external_id);
            
            if (itemDetails.success && itemDetails.product) {
              newPrice = itemDetails.product.price.current;
              inStock = itemDetails.product.quantity?.available > 0;
              additionalData = {
                seller_info: itemDetails.product.seller,
                shipping_cost: itemDetails.product.shipping?.cost
              };
            } else {
              console.error(`Failed to get eBay details for ${product.external_id}`);
              continue;
            }
          } catch (ebayError) {
            console.error(`eBay API error for ${product.external_id}:`, ebayError.message);
            results.errors.push({
              product_id: product.id,
              error: ebayError.message
            });
            continue;
          }
        } else if (product.platform === 'amazon') {
          // Amazon price checking would go here
          // For now, skip Amazon products since we need PA-API
          console.log(`Skipping Amazon product ${product.id} (PA-API required)`);
          continue;
        } else {
          // Generic web scraping for other platforms
          // This would use the scraper service
          console.log(`Skipping unsupported platform: ${product.platform}`);
          continue;
        }
        
        // Compare with current price
        const oldPrice = product.current_price;
        const priceChanged = oldPrice !== null && Math.abs(oldPrice - newPrice) > 0.01;
        
        if (priceChanged || product.in_stock !== inStock) {
          // Update product price
          const { error: updateError } = await ProductService.updatePrice(
            product.id,
            newPrice,
            inStock
          );
          
          if (updateError) {
            console.error(`Failed to update price for ${product.id}:`, updateError);
            results.errors.push({
              product_id: product.id,
              error: updateError.message
            });
            continue;
          }
          
          results.updated++;
          
          // Record price history
          await PriceHistoryService.record(product.id, newPrice, {
            currency: product.currency,
            in_stock: inStock,
            ...additionalData
          });
          
          // Check if price dropped below any target prices
          if (oldPrice && newPrice < oldPrice) {
            console.log(`💰 Price drop detected for ${product.name}: $${oldPrice} → $${newPrice}`);
            
            // Create price drop alert
            const dropPercentage = ((oldPrice - newPrice) / oldPrice * 100).toFixed(1);
            
            // This will check all tracking entries and create alerts
            const alertData = {
              product_id: product.id,
              alert_type: 'price_drop',
              old_price: oldPrice,
              new_price: newPrice,
              message: `Price dropped ${dropPercentage}% for ${product.name}`,
              metadata: {
                drop_percentage: dropPercentage,
                savings: (oldPrice - newPrice).toFixed(2)
              }
            };
            
            // The AlertService will handle finding users who track this product
            // and creating alerts for those whose target price is met
            const { created } = await AlertService.checkAndCreatePriceDropAlerts();
            results.alerts += created;
          }
        } else {
          // Just update last_checked timestamp
          await ProductService.update(product.id, {
            last_checked: new Date().toISOString()
          });
        }
        
      } catch (productError) {
        console.error(`Error checking product ${product.id}:`, productError);
        results.errors.push({
          product_id: product.id,
          error: productError.message
        });
      }
    }
    
    // Process any pending alerts
    await processAlerts();
    
    console.log('✅ Price check completed:', results);
    
    return res.json({
      success: true,
      message: 'Price check completed successfully',
      results,
      next_run: new Date(Date.now() + 3600000).toISOString() // Next run in 1 hour
    });
    
  } catch (error) {
    console.error('❌ Price check failed:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Price check failed',
      message: error.message,
      results
    });
  }
};

// Process and send alerts
async function processAlerts() {
  try {
    const { data: alerts, error } = await AlertService.getUnsent(50);
    
    if (error || !alerts) {
      console.error('Failed to get unsent alerts:', error);
      return;
    }
    
    for (const alert of alerts) {
      try {
        // Send email notification
        if (alert.api_users?.email && alert.notification_channels?.includes('email')) {
          const emailSent = await sendPriceDropEmail(
            alert.api_users.email,
            {
              name: alert.products.name,
              url: alert.products.url
            },
            alert.old_price,
            alert.new_price
          );
          
          if (emailSent) {
            await AlertService.markAsSent(alert.id);
          }
        }
        
        // Send webhook notification
        if (alert.notification_channels?.includes('webhook') && alert.webhook_url) {
          try {
            await axios.post(alert.webhook_url, {
              event: 'price_drop',
              product: alert.products,
              old_price: alert.old_price,
              new_price: alert.new_price,
              message: alert.message,
              timestamp: new Date().toISOString()
            });
            
            await AlertService.markAsSent(alert.id);
          } catch (webhookError) {
            console.error('Webhook failed:', webhookError.message);
          }
        }
        
      } catch (alertError) {
        console.error(`Failed to process alert ${alert.id}:`, alertError);
      }
    }
  } catch (error) {
    console.error('Alert processing failed:', error);
  }
}

// Export for testing
module.exports.processAlerts = processAlerts;