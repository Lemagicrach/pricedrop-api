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

    const { limit = 20, offset = 0, sort = 'created_at', order = 'desc' } = req.query;

    // Get products for this API key
    const { data: products, error, count } = await supabase
      .from('products')
      .select('*', { count: 'exact' })
      .eq('rapidapi_key', rapidApiKey)
      .order(sort, { ascending: order === 'asc' })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json({
      success: true,
      products,
      pagination: {
        total: count,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: count > offset + limit
      }
    });

  } catch (error) {
    console.error('Products list error:', error);
    res.status(500).json({
      error: 'Failed to fetch products',
      message: error.message
    });
  }
}