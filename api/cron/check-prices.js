const {
  ProductService,
  PriceHistoryService,
  AlertService
} = require('../../services/supabase');
const { extractProductInfo } = require('../../services/productScraper');
const { sendNotification } = require('../../services/notifications');

module.exports = async function handler(req = {}, res) {
  if (req.method && !['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({
      success: false,
      error: {
        message: 'Method not allowed. Use GET or POST.',
        code: 'METHOD_NOT_ALLOWED'
      }
    });
  }

  const startedAt = Date.now();

  try {
    const { data: products, error: productsError } = await ProductService.getProductsToCheck(25);

    if (productsError) {
      throw productsError;
    }

    if (!products || products.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          processed: 0,
          updated: 0,
          alerts_created: 0,
          notifications_sent: 0,
          duration_ms: Date.now() - startedAt,
          results: []
        }
      });
    }

    const results = [];
    let alertsCreated = 0;

    for (const product of products) {
      const result = {
        product_id: product.id,
        url: product.url,
        platform: product.platform
      };

      try {
        const productInfo = await extractProductInfo(product.url);

        if (!productInfo.success) {
          result.status = 'skipped';
          result.reason = productInfo.error || 'SCRAPE_FAILED';
          results.push(result);
          continue;
        }

        const newPrice = typeof productInfo.price === 'number'
          ? productInfo.price
          : Number(productInfo.price);
        const oldPrice = typeof product.current_price === 'number'
          ? product.current_price
          : Number(product.current_price);

        await PriceHistoryService.record(product.id, newPrice, {
          in_stock: productInfo.in_stock,
          currency: productInfo.currency,
          timestamp: new Date().toISOString()
        });

        await ProductService.update(product.id, {
          current_price: newPrice,
          in_stock: productInfo.in_stock,
          image_url: productInfo.image,
          last_checked: new Date().toISOString()
        });

        const alertResult = await AlertService.checkAndCreatePriceDropAlerts(product, {
          oldPrice,
          newPrice
        });

        alertsCreated += alertResult.created || 0;

        result.status = 'updated';
        result.price = newPrice;
        result.alerts_created = alertResult.created || 0;
        results.push(result);
      } catch (error) {
        console.error('Failed to process product during cron run:', {
          product: product.id,
          error: error.message
        });

        result.status = 'failed';
        result.reason = error.message || 'UNKNOWN_ERROR';
        results.push(result);
      }
    }

    const notifications = {
      sent: 0,
      errors: []
    };

    try {
      const { data: pendingAlerts, error: alertsError } = await AlertService.getUnsent(50);

      if (alertsError) {
        throw alertsError;
      }

      if (Array.isArray(pendingAlerts)) {
        for (const alert of pendingAlerts) {
          try {
            await sendNotification({
              type: 'price_drop',
              email: alert.api_users?.email,
              webhook_url: alert.webhook_url,
              product: alert.products,
              old_price: alert.old_price,
              current_price: alert.new_price,
              target_price: alert.target_price
            });

            await AlertService.markAsSent(alert.id);
            notifications.sent += 1;
          } catch (notifyError) {
            notifications.errors.push({
              alert_id: alert.id,
              message: notifyError.message
            });
          }
        }
      }
    } catch (notificationError) {
      console.error('Failed to dispatch notifications:', notificationError);
    }

    return res.status(200).json({
      success: true,
      data: {
        processed: products.length,
        updated: results.filter(item => item.status === 'updated').length,
        alerts_created: alertsCreated,
        notifications_sent: notifications.sent,
        notification_errors: notifications.errors,
        duration_ms: Date.now() - startedAt,
        results
      }
    });
  } catch (error) {
    console.error('Price check cron job failed:', error);

    const status = error.message?.includes('Supabase client is not configured') ? 503 : 500;

    return res.status(status).json({
      success: false,
      error: {
        message: status === 503
          ? 'Database not configured. Please provide Supabase credentials before running the cron job.'
          : 'Failed to execute price check cron job.',
        code: status === 503 ? 'SERVICE_UNAVAILABLE' : 'CRON_FAILED',
        details: error.message
      }
    });
  }
};