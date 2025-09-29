// services/supabase.js - Real Supabase Implementation
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not found. Database features will be limited.');
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// Product operations
const ProductService = {
  async create(productData) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();
    
    return { data, error };
  },

  async findByUrl(url) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('url', url)
      .single();
    
    return { data, error };
  },

  async findById(id) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  async update(id, updates) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  },

  async updatePrice(productId, newPrice, inStock = true) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    // Start a transaction-like operation
    const updates = {
      current_price: newPrice,
      in_stock: inStock,
      last_checked: new Date().toISOString()
    };

    // Update product
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updates)
      .eq('id', productId)
      .select()
      .single();

    if (productError) return { data: null, error: productError };

    // Update lowest/highest prices if needed
    if (product.lowest_price === null || newPrice < product.lowest_price) {
      await supabase
        .from('products')
        .update({ lowest_price: newPrice })
        .eq('id', productId);
    }
    
    if (product.highest_price === null || newPrice > product.highest_price) {
      await supabase
        .from('products')
        .update({ highest_price: newPrice })
        .eq('id', productId);
    }

    return { data: product, error: null };
  },

  async getProductsToCheck(limit = 100) {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    // Get products that haven't been checked in the last hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .or(`last_checked.is.null,last_checked.lt.${oneHourAgo}`)
      .limit(limit);
    
    return { data: data || [], error };
  }
};

// Price History operations
const PriceHistoryService = {
  async record(productId, price, additionalData = {}) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('price_history')
      .insert([{
        product_id: productId,
        price: price,
        currency: additionalData.currency || 'USD',
        in_stock: additionalData.in_stock !== false,
        shipping_cost: additionalData.shipping_cost,
        seller_info: additionalData.seller_info
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getHistory(productId, days = 30) {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });
    
    return { data: data || [], error };
  },

  async getLatestPrice(productId) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    return { data, error };
  }
};

// User and API Key operations
const UserService = {
  async findByApiKey(apiKey) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('api_users')
      .select('*')
      .eq('api_key', apiKey)
      .single();
    
    return { data, error };
  },

  async incrementCredits(userId, amount = 1) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase.rpc('increment_credits', {
      user_id: userId,
      amount: amount
    });
    
    return { data, error };
  },

  async checkRateLimit(userId, limit) {
    if (!supabase) return { allowed: true, error: null };
    
    const { data, error } = await supabase
      .from('api_users')
      .select('credits_used, credits_limit')
      .eq('id', userId)
      .single();
    
    if (error) return { allowed: false, error };
    
    return { 
      allowed: data.credits_used < data.credits_limit,
      remaining: data.credits_limit - data.credits_used,
      error: null
    };
  }
};

// Tracking operations
const TrackingService = {
  async create(userId, productId, settings = {}) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('user_tracking')
      .insert([{
        user_id: userId,
        product_id: productId,
        target_price: settings.target_price,
        alert_enabled: settings.alert_enabled !== false,
        alert_type: settings.alert_type || 'price_drop',
        check_frequency: settings.check_frequency || 3600
      }])
      .select()
      .single();
    
    return { data, error };
  },

  async getUserTracking(userId, limit = 100) {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('user_tracking')
      .select(`
        *,
        products (*)
      `)
      .eq('user_id', userId)
      .limit(limit);
    
    return { data: data || [], error };
  },

  async getTrackingWithAlerts() {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('user_tracking')
      .select(`
        *,
        products (*),
        api_users (email)
      `)
      .eq('alert_enabled', true)
      .not('target_price', 'is', null);
    
    return { data: data || [], error };
  },

  async updateLastNotified(trackingId) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('user_tracking')
      .update({ last_notified: new Date().toISOString() })
      .eq('id', trackingId)
      .select()
      .single();
    
    return { data, error };
  }
};

// Alert operations
const AlertService = {
  async create(alertData) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('alerts')
      .insert([alertData])
      .select()
      .single();
    
    return { data, error };
  },

  async getUnsent(limit = 100) {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('alerts')
      .select(`
        *,
        api_users (email),
        products (name, url)
      `)
      .eq('sent', false)
      .limit(limit);
    
    return { data: data || [], error };
  },

  async markAsSent(alertId) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('alerts')
      .update({ 
        sent: true, 
        sent_at: new Date().toISOString() 
      })
      .eq('id', alertId)
      .select()
      .single();
    
    return { data, error };
  },

  async checkAndCreatePriceDropAlerts() {
    if (!supabase) return { created: 0, error: 'Database not configured' };
    
    // Get all active trackings with target prices
    const { data: trackings, error: trackingError } = await TrackingService.getTrackingWithAlerts();
    
    if (trackingError) return { created: 0, error: trackingError };
    
    let alertsCreated = 0;
    
    for (const tracking of trackings) {
      const product = tracking.products;
      
      // Check if current price is below target price
      if (product.current_price && 
          tracking.target_price && 
          product.current_price <= tracking.target_price) {
        
        // Check if we haven't notified recently (within 24 hours)
        const lastNotified = tracking.last_notified 
          ? new Date(tracking.last_notified) 
          : new Date(0);
        const hoursSinceNotified = (Date.now() - lastNotified.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceNotified >= 24) {
          // Create alert
          const { error: alertError } = await AlertService.create({
            user_id: tracking.user_id,
            product_id: tracking.product_id,
            tracking_id: tracking.id,
            alert_type: 'price_drop',
            old_price: tracking.target_price,
            new_price: product.current_price,
            message: `Price dropped below your target! ${product.name} is now $${product.current_price}`,
            notification_channels: ['email', 'api']
          });
          
          if (!alertError) {
            alertsCreated++;
            await TrackingService.updateLastNotified(tracking.id);
          }
        }
      }
    }
    
    return { created: alertsCreated, error: null };
  }
};

// Analytics operations
const AnalyticsService = {
  async logApiCall(logData) {
    if (!supabase) return { data: null, error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('api_logs')
      .insert([logData])
      .select()
      .single();
    
    return { data, error };
  },

  async getRecentPriceDrops(hours = 24, limit = 50) {
    if (!supabase) return { data: [], error: 'Database not configured' };
    
    const { data, error } = await supabase
      .from('recent_price_drops')
      .select('*')
      .limit(limit);
    
    return { data: data || [], error };
  }
};

module.exports = {
  supabase,
  ProductService,
  PriceHistoryService,
  UserService,
  TrackingService,
  AlertService,
  AnalyticsService
};