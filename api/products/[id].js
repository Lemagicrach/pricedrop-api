import { supabase } from '../../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../../lib/rapidapi';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-RapidAPI-Host');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    const rapidApiKey = verifyRapidAPI(req);
    await checkRateLimit(rapidApiKey);

    if (req.method === 'GET') {
      // Get product details with price history
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          price_history (
            price,
            in_stock,
            created_at
          )
        `)
        .eq('id', id)
        .eq('rapidapi_key', rapidApiKey)
        .single();

      if (error || !product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.status(200).json({
        success: true,
        product
      });

    } else if (req.method === 'DELETE') {
      // Delete product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('rapidapi_key', rapidApiKey);

      if (error) throw error;

      res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });

    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Product operation error:', error);
    res.status(500).json({
      error: 'Operation failed',
      message: error.message
    });
  }
}
