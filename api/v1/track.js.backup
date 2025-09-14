import { supabase } from '../../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../../lib/rapidapi';
import { trackProductSchema, validateUrl } from '../../lib/validators';
import { scrapePrice } from '../../lib/scraper';

// Response helper
const sendResponse = (res, status, data, error = null) => {
  return res.status(status).json({
    success: status < 400,
    ...(data && { data }),
    ...(error && { error: error.message || error }),
    timestamp: new Date().toISOString()
  });
};

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host, X-RapidAPI-User');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, null, 'Method not allowed. Use POST');
  }

  let rapidApiData;
  
  if (req.headers['x-some-secret'] !== process.env.SOME_SECRET) {
  return res.status(404).json({ error: 'Not Found' });
}

  try {
    // Verify RapidAPI authentication
    rapidApiData = verifyRapidAPI(req);
    
    // Check rate limit
    await checkRateLimit(rapidApiData);

    // Validate input
    const validatedData = trackProductSchema.parse(req.body);
    const { url, target_price, notify_on_drop } = validatedData;

    // Validate URL is supported
    validateUrl(url);

    // Normalize URL (remove tracking parameters)
    const normalizedUrl = normalizeProductUrl(url);

    // Check if already tracking
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('url', normalizedUrl)
      .eq('rapidapi_key', rapidApiData.apiKey)
      .single();

    if (existing) {
      // Update target price if provided
      if (target_price !== undefined || notify_on_drop !== undefined) {
        const updates = {};
        if (target_price !== undefined) updates.target_price = target_price;
        if (notify_on_drop !== undefined) updates.notify_on_drop = notify_on_drop;
        
        const { data: updated, error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', existing.id)
          .select()
          .single();
        
        if (updateError) throw updateError;
        
        return sendResponse(res, 200, {
          message: 'Product already tracked. Settings updated.',
          product: updated
        });
      }
      
      return sendResponse(res, 200, {
        message: 'Product already being tracked',
        product: existing
      });
    }

    // Scrape current price with retry logic
    let scrapedData;
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      try {
        scrapedData = await scrapePrice(normalizedUrl);
        break;
      } catch (scrapeError) {
        lastError = scrapeError;
        retries--;
        if (retries > 0) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
        }
      }
    }
    
    if (!scrapedData) {
      throw new Error(`Failed to scrape product after 3 attempts: ${lastError?.message}`);
    }

    // Insert product
    const { data: product, error: insertError } = await supabase
      .from('products')
      .insert({
        url: normalizedUrl,
        name: scrapedData.name || 'Unknown Product',
        current_price: scrapedData.price,
        original_price: scrapedData.price,
        lowest_price: scrapedData.price,
        highest_price: scrapedData.price,
        target_price: target_price || null,
        currency: scrapedData.currency || 'USD',
        store: scrapedData.store,
        image_url: scrapedData.image,
        in_stock: scrapedData.inStock !== false,
        notify_on_drop: notify_on_drop || false,
        rapidapi_key: rapidApiData.apiKey,
        last_checked: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return sendResponse(res, 409, null, 'Product already exists');
      }
      throw insertError;
    }

    // Add initial price to history
    await supabase
      .from('price_history')
      .insert({
        product_id: product.id,
        price: scrapedData.price,
        in_stock: scrapedData.inStock !== false,
        currency: scrapedData.currency || 'USD'
      });

    // Create default alert if target price is set
    if (target_price) {
      await supabase
        .from('alerts')
        .insert({
          product_id: product.id,
          rapidapi_key: rapidApiData.apiKey,
          target_price,
          alert_type: 'price_drop',
          notification_channels: ['api'],
          is_active: true
        });
    }

    // Return success response
    return sendResponse(res, 201, {
      message: 'Product tracking started successfully',
      product: {
        id: product.id,
        url: product.url,
        name: product.name,
        current_price: product.current_price,
        currency: product.currency,
        store: product.store,
        in_stock: product.in_stock,
        tracking_since: product.created_at
      }
    });

  } catch (error) {
    console.error('Track endpoint error:', error);
    
    // Handle different error types
    if (error.name === 'ZodError') {
      return sendResponse(res, 400, null, {
        message: 'Validation error',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
    }
    
    if (error.message?.includes('Rate limit')) {
      return sendResponse(res, 429, null, error.message);
    }
    
    if (error.message?.includes('Unsupported store')) {
      return sendResponse(res, 400, null, error.message);
    }
    
    if (error.message?.includes('Missing X-RapidAPI-Key')) {
      return sendResponse(res, 401, null, 'Authentication required');
    }
    
    // Generic error
    return sendResponse(res, 500, null, 
      process.env.NODE_ENV === 'production' 
        ? 'An error occurred while processing your request'
        : error.message
    );
  }
}

// Helper function to normalize product URLs
function normalizeProductUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const paramsToRemove = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'ref', 'affiliate', 'tag', 'source', 'click_id'
    ];
    
    paramsToRemove.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Amazon specific: extract ASIN
    if (urlObj.hostname.includes('amazon')) {
      const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
      if (asinMatch) {
        const asin = asinMatch[1] || asinMatch[2];
        return `https://www.amazon.com/dp/${asin}`;
      }
    }
    
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}