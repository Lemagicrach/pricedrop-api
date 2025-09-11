import { supabase } from '../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../lib/rapidapi';
import { trackProductSchema, validateUrl } from '../lib/validators';
import { scrapePrice } from '../lib/scraper';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify RapidAPI
    const rapidApiKey = verifyRapidAPI(req);
    
    // Check rate limit
    await checkRateLimit(rapidApiKey);

    // Validate input
    const validatedData = trackProductSchema.parse(req.body);
    const { url, target_price, notify_on_drop } = validatedData;

    // Validate URL is supported
    validateUrl(url);

    // Check if already tracking
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('url', url)
      .eq('rapidapi_key', rapidApiKey)
      .single();

    if (existing) {
      // Update target price if provided
      if (target_price) {
        await supabase
          .from('products')
          .update({ target_price, notify_on_drop })
          .eq('id', existing.id);
        existing.target_price = target_price;
        existing.notify_on_drop = notify_on_drop;
      }
      
      return res.status(200).json({
        success: true,
        message: 'Product already being tracked',
        product: existing
      });
    }

    // Scrape current price
    const scrapedData = await scrapePrice(url);

    // Insert product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        url,
        name: scrapedData.name,
        current_price: scrapedData.price,
        original_price: scrapedData.price,
        lowest_price: scrapedData.price,
        highest_price: scrapedData.price,
        target_price: target_price || null,
        currency: scrapedData.currency,
        store: scrapedData.store,
        image_url: scrapedData.image,
        in_stock: scrapedData.inStock,
        notify_on_drop: notify_on_drop || false,
        rapidapi_key: rapidApiKey,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Add initial price to history
    await supabase
      .from('price_history')
      .insert({
        product_id: product.id,
        price: scrapedData.price,
        in_stock: scrapedData.inStock,
        created_at: new Date().toISOString()
      });

    res.status(201).json({
      success: true,
      product
    });

  } catch (error) {
    console.error('Track endpoint error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to track product',
      message: error.message
    });
  }
}