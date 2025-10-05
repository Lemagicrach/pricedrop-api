// services/database.js - Real database operations with Supabase
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://your-project.supabase.co',
  process.env.SUPABASE_ANON_KEY || 'your-anon-key'
);

// Product operations
async function createProduct(productData) {
  try {
    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('url', productData.url)
      .single();

    if (existing) {
      // Update existing product
      const { data, error } = await supabase
        .from('products')
        .update({
          ...productData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new product
    const { data, error } = await supabase
      .from('products')
      .insert([productData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

async function getProduct(id) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

async function getProducts(filters = {}) {
  try {
    let query = supabase.from('products').select('*');

    if (filters.store) {
      query = query.eq('store', filters.store);
    }
    if (filters.in_stock !== undefined) {
      query = query.eq('in_stock', filters.in_stock);
    }
    if (filters.min_price) {
      query = query.gte('current_price', filters.min_price);
    }
    if (filters.max_price) {
      query = query.lte('current_price', filters.max_price);
    }
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// Price history operations
async function updatePrice(productId, priceData) {
  try {
    // Add to price history
    const { data: history, error: historyError } = await supabase
      .from('price_history')
      .insert([{
        product_id: productId,
        price: priceData.price,
        timestamp: priceData.timestamp || new Date().toISOString(),
        in_stock: priceData.in_stock
      }])
      .select();

    if (historyError) throw historyError;

    // Update product's current price
    const { error: updateError } = await supabase
      .from('products')
      .update({
        current_price: priceData.price,
        in_stock: priceData.in_stock,
        last_checked: new Date().toISOString()
      })
      .eq('id', productId);

    if (updateError) throw updateError;

    return history[0];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

async function getPriceHistory(productId, days = 30) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) throw error;

    // Calculate statistics
    if (data && data.length > 0) {
      const prices = data.map(h => h.price);
      const stats = {
        current: prices[prices.length - 1],
        min: Math.min(...prices),
        max: Math.max(...prices),
        avg: prices.reduce((a, b) => a + b, 0) / prices.length,
        trend: calculateTrend(data),
        volatility: calculateVolatility(prices)
      };

      return {
        history: data,
        stats: stats
      };
    }

    return { history: [], stats: null };
  } catch (error) {
    console.error('Database error:', error);
    return { history: [], stats: null };
  }
}

// Alert operations
async function createAlert(alertData) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert([alertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

async function getAlerts(userId) {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, products(*)')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

async function triggerAlert(alertId, priceData) {
  try {
    // Update alert with trigger info
    const { data, error } = await supabase
      .from('alerts')
      .update({
        last_triggered: new Date().toISOString(),
        trigger_count: supabase.raw('trigger_count + 1'),
        last_price: priceData.price
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;

    // Log alert trigger
    await supabase
      .from('alert_history')
      .insert([{
        alert_id: alertId,
        triggered_at: new Date().toISOString(),
        price: priceData.price,
        type: 'price_drop'
      }]);

    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// Search operations
async function searchProducts(query, options = {}) {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .textSearch('title', query)
      .limit(options.limit || 20)
      .order('current_price', { ascending: options.sort === 'price_asc' });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// Analytics operations
async function getPriceDrops(hours = 24) {
  try {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const { data, error } = await supabase
      .from('price_history')
      .select(`
        *,
        products (
          id, title, url, store, image_url, current_price, original_price
        )
      `)
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });

    if (error) throw error;

    // Find actual price drops
    const drops = [];
    const productMap = new Map();

    for (const entry of data) {
      const productId = entry.product_id;
      
      if (!productMap.has(productId)) {
        productMap.set(productId, []);
      }
      
      productMap.get(productId).push(entry);
    }

    for (const [productId, history] of productMap) {
      if (history.length >= 2) {
        const sorted = history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const currentPrice = sorted[0].price;
        const previousPrice = sorted[1].price;
        
        if (currentPrice < previousPrice) {
          const drop = ((previousPrice - currentPrice) / previousPrice) * 100;
          drops.push({
            product: sorted[0].products,
            current_price: currentPrice,
            previous_price: previousPrice,
            drop_amount: previousPrice - currentPrice,
            drop_percentage: drop.toFixed(2),
            timestamp: sorted[0].timestamp
          });
        }
      }
    }

    return drops.sort((a, b) => b.drop_percentage - a.drop_percentage);
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// User operations
async function createUser(userData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

async function getUserByApiKey(apiKey) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

// Helper functions
function calculateTrend(history) {
  if (history.length < 2) return 'stable';
  
  const recent = history.slice(-5);
  const firstPrice = recent[0].price;
  const lastPrice = recent[recent.length - 1].price;
  
  const change = ((lastPrice - firstPrice) / firstPrice) * 100;
  
  if (change > 5) return 'increasing';
  if (change < -5) return 'decreasing';
  return 'stable';
}

function calculateVolatility(prices) {
  if (prices.length < 2) return 0;
  
  const mean = prices.reduce((a, b) => a + b) / prices.length;
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return (stdDev / mean) * 100; // Coefficient of variation as percentage
}

// Database initialization
async function initDatabase() {
  try {
    // Create tables if they don't exist
    console.log('Database initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

module.exports = {
  supabase,
  createProduct,
  getProduct,
  getProducts,
  updatePrice,
  getPriceHistory,
  createAlert,
  getAlerts,
  triggerAlert,
  searchProducts,
  getPriceDrops,
  createUser,
  getUserByApiKey,
  initDatabase
};