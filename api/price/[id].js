import { supabase } from '../../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../../lib/rapidapi';
import { scrapePrice } from '../../lib/scraper';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  try {
    const rapidApiKey = verifyRapidAPI(req);
    await checkRateLimit(rapidApiKey);

    // Get product
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('rapidapi_key', rapidApiKey)
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if refresh is requested or last update is old
    const { refresh = 'false' } = req.query;
    const lastUpdate = new Date(product.updated_at);
    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);

    if (refresh === 'true' || hoursSinceUpdate > 1) {
      // Scrape fresh price
      const scrapedData = await scrapePrice(product.url);

      // Update product
      const updates = {
        current_price: scrapedData.price,
        in_stock: scrapedData.inStock,
        updated_at: new Date().toISOString()
      };

      // Update lowest/highest prices
      if (scrapedData.price < product.lowest_price) {
        updates.lowest_price = scrapedData.price;
      }
      if (scrapedData.price > product.highest_price) {
        updates.highest_price = scrapedData.price;
      }

      await supabase
        .from('products')
        .update(updates)
        .eq('id', id);

      // Add to price history if price changed
      if (scrapedData.price !== product.current_price) {
        await supabase
          .from('price_history')
          .insert({
            product_id: id,
            price: scrapedData.price,
            in_stock: scrapedData.inStock
          });
      }

      product.current_price = scrapedData.price;
      product.in_stock = scrapedData.inStock;
      product.updated_at = updates.updated_at;
    }

    res.status(200).json({
      success: true,
      price: product.current_price,
      currency: product.currency,
      in_stock: product.in_stock,
      lowest_price: product.lowest_price,
      highest_price: product.highest_price,
      last_updated: product.updated_at
    });

  } catch (error) {
    console.error('Price check error:', error);
    res.status(500).json({
      error: 'Failed to check price',
      message: error.message
    });
  }
}