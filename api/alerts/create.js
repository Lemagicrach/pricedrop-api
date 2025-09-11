import { supabase } from '../../lib/supabase';
import { verifyRapidAPI, checkRateLimit } from '../../lib/rapidapi';
import { createAlertSchema } from '../../lib/validators';

export default async function handler(req, res) {
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
    const rapidApiKey = verifyRapidAPI(req);
    await checkRateLimit(rapidApiKey);

    // Validate input
    const validatedData = createAlertSchema.parse(req.body);
    const { product_id, target_price, alert_type, notification_channels } = validatedData;

    // Verify product belongs to user
    const { data: product } = await supabase
      .from('products')
      .select('*')
      .eq('id', product_id)
      .eq('rapidapi_key', rapidApiKey)
      .single();

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check for existing alert
    const { data: existing } = await supabase
      .from('alerts')
      .select('*')
      .eq('product_id', product_id)
      .eq('rapidapi_key', rapidApiKey)
      .eq('is_active', true)
      .single();

    if (existing) {
      // Update existing alert
      const { data: alert, error } = await supabase
        .from('alerts')
        .update({
          target_price,
          alert_type,
          notification_channels,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return res.status(200).json({
        success: true,
        message: 'Alert updated',
        alert
      });
    }

    // Create new alert
    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        product_id,
        target_price,
        alert_type,
        notification_channels,
        rapidapi_key: rapidApiKey,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      alert
    });

  } catch (error) {
    console.error('Alert creation error:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({
      error: 'Failed to create alert',
      message: error.message
    });
  }
}
