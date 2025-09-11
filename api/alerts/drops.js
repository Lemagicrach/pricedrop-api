import { supabase } from '../../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../../lib/rapidapi';

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

  try {
    const rapidApiKey = verifyRapidAPI(req);
    await checkRateLimit(rapidApiKey);

    const { min_discount = 10, time_range = '24h' } = req.query;

    // Calculate time filter
    const hoursMap = {
      '1h': 1,
      '6h': 6,
      '12h': 12,
      '24h': 24,
      '48h': 48,
      '7d': 168
    };
    const hours = hoursMap[time_range] || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get products with recent price drops
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .eq('rapidapi_key', rapidApiKey)
      .gte('updated_at', since)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    // Filter by discount percentage
    const priceDrops = products.filter(product => {
      if (!product.original_price || !product.current_price) return false;
      const discount = ((product.original_price - product.current_price) / product.original_price) * 100;
      return discount >= min_discount;
    }).map(product => {
      const discount = ((product.original_price - product.current_price) / product.original_price) * 100;
      return {
        ...product,
        discount_percent: discount.toFixed(1),
        savings: (product.original_price - product.current_price).toFixed(2)
      };
    });

    res.status(200).json({
      success: true,
      products: priceDrops,
      count: priceDrops.length,
      filters: {
        min_discount,
        time_range,
        since
      }
    });

  } catch (error) {
    console.error('Price drops error:', error);
    res.status(500).json({
      error: 'Failed to fetch price drops',
      message: error.message
    });
  }
}