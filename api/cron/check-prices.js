import { supabase } from '../../lib/supabase';
import { scrapePrice } from '../../lib/scraper';
import { sendPriceDropEmail } from '../../lib/notifications';

export default async function handler(req, res) {
  // This endpoint should be protected
  const cronSecret = req.headers['x-cron-secret'];
  if (cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get all products that need checking (updated > 6 hours ago)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .lt('updated_at', sixHoursAgo)
      .limit(50); // Process in batches

    if (error) throw error;

    const results = {
      checked: 0,
      updated: 0,
      priceDrops: 0,
      errors: 0
    };

    for (const product of products) {
      try {
        const scrapedData = await scrapePrice(product.url);
        results.checked++;

        if (scrapedData.price !== product.current_price) {
          // Price changed
          const updates = {
            current_price: scrapedData.price,
            in_stock: scrapedData.inStock,
            updated_at: new Date().toISOString()
          };

          // Update lowest/highest
          if (scrapedData.price < product.lowest_price) {
            updates.lowest_price = scrapedData.price;
          }
          if (scrapedData.price > product.highest_price) {
            updates.highest_price = scrapedData.price;
          }

          await supabase
            .from('products')
            .update(updates)
            .eq('id', product.id);

          // Add to history
          await supabase
            .from('price_history')
            .insert({
              product_id: product.id,
              price: scrapedData.price,
              in_stock: scrapedData.inStock
            });

          results.updated++;

          // Check for price drop alerts
          if (scrapedData.price < product.current_price) {
            results.priceDrops++;

            // Check alerts
            const { data: alerts } = await supabase
              .from('alerts')
              .select('*')
              .eq('product_id', product.id)
              .eq('is_active', true)
              .gte('target_price', scrapedData.price);

            for (const alert of alerts || []) {
              // Log triggered alert
              await supabase
                .from('triggered_alerts')
                .insert({
                  alert_id: alert.id,
                  product_id: product.id,
                  price_when_triggered: scrapedData.price,
                  discount_percent: ((product.original_price - scrapedData.price) / product.original_price * 100)
                });

              // Send notifications (implement based on channels)
              // This is where you'd send emails, webhooks, etc.
            }
          }
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        console.error(`Error checking product ${product.id}:`, error);
        results.errors++;
      }
    }

    res.status(200).json({
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({
      error: 'Cron job failed',
      message: error.message
    });
  }
}
