// services/database-secure.js - Database operations with security fixes
const { createClient } = require('@supabase/supabase-js');

// Lazy initialization - only check when actually used
let supabase = null;
let initializationError = null;

function getSupabase() {
  if (supabase) return supabase;
  
  if (initializationError) throw initializationError;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    initializationError = new Error(
      'Database configuration missing! Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
    );
    console.error('❌ Database not configured');
    console.error('   Set SUPABASE_URL and SUPABASE_ANON_KEY in .env.local');
    throw initializationError;
  }
  
  // Initialize Supabase with connection pool settings
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'x-connection-pool': 'true'
      }
    }
  });
  
  console.log('✅ Database connection initialized');
  return supabase;
}

// Create a proxy that auto-initializes on first access
const supabaseProxy = new Proxy({}, {
  get(target, prop) {
    return getSupabase()[prop];
  }
});

// ============================================
// USER OPERATIONS
// ============================================

/**
 * Create a new user
 */
async function createUser(userData) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
      .from('api_users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Get user by API key
 */
async function getUserByApiKey(apiKey) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
      .from('api_users')
      .select('*')
      .eq('api_key', apiKey)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to get user by API key:', error);
    return null;
  }
}

// ============================================
// PRODUCT OPERATIONS
// ============================================

/**
 * Create or update product with validation
 */
async function createProduct(productData) {
  try {
    const db = getSupabase();
    
    // Validate required fields
    if (!productData.url) {
      throw new Error('Product URL is required');
    }
    
    if (!productData.platform) {
      throw new Error('Platform is required');
    }
    
    // Sanitize input data
    const sanitized = {
      ...productData,
      url: productData.url.trim(),
      platform: productData.platform.toLowerCase(),
      name: productData.name?.substring(0, 255),
      description: productData.description?.substring(0, 1000),
      current_price: Math.max(0, Number(productData.current_price) || 0),
      created_at: new Date().toISOString()
    };

    // Check if product already exists
    const { data: existing } = await db
      .from('products')
      .select('*')
      .eq('url', sanitized.url)
      .single();

    if (existing) {
      // Update existing product
      const { data, error } = await db
        .from('products')
        .update({
          ...sanitized,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    }

    // Create new product
    const { data, error } = await db
      .from('products')
      .insert([sanitized])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Get product by ID
 */
async function getProduct(id) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
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

/**
 * Get products with filters
 */
async function getProducts(filters = {}) {
  try {
    const db = getSupabase();
    let query = db.from('products').select('*');

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
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
    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    return [];
  }
}

// ============================================
// PRICE HISTORY OPERATIONS
// ============================================

/**
 * Update price and add to history
 */
async function updatePrice(productId, priceData) {
  try {
    const db = getSupabase();
    
    // Get current price first
    const { data: currentProduct } = await db
      .from('products')
      .select('current_price')
      .eq('id', productId)
      .single();
    
    const priceChanged = currentProduct && 
                        currentProduct.current_price !== priceData.price;
    
    // Log price history if changed
    if (!currentProduct || priceChanged) {
      const historyRecord = {
        product_id: productId,
        price: priceData.price,
        in_stock: priceData.in_stock !== undefined ? priceData.in_stock : true,
        recorded_at: priceData.timestamp || new Date().toISOString()
      };
      
      if (priceData.currency) {
        historyRecord.currency = priceData.currency;
      }
      
      const { error: historyError } = await db
        .from('price_history')
        .insert([historyRecord]);

      if (historyError) throw historyError;

      // Update product's current price
      const { error: updateError } = await db
        .from('products')
        .update({
          current_price: priceData.price,
          in_stock: priceData.in_stock !== undefined ? priceData.in_stock : true,
          last_checked: new Date().toISOString()
        })
        .eq('id', productId);

      if (updateError) throw updateError;
    }
    
    return { priceChanged };
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Get price history
 */
async function getPriceHistory(productId, days = 30) {
  try {
    const db = getSupabase();
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await db
      .from('price_history')
      .select('*')
      .eq('product_id', productId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) throw error;
    return { history: data || [] };
  } catch (error) {
    console.error('Database error:', error);
    return { history: [] };
  }
}

// ============================================
// ALERT OPERATIONS
// ============================================

/**
 * Create alert
 */
async function createAlert(alertData) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
      .from('alerts')
      .insert([{
        ...alertData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Get alerts for user
 */
async function getAlerts(userId, options = {}) {
  try {
    const db = getSupabase();
    
    let query = db
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (options.status && options.status !== 'all') {
      query = query.eq('status', options.status);
    }

    if (options.triggered !== undefined) {
      query = query.eq('triggered', options.triggered);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Get alert by ID
 */
async function getAlertById(alertId) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}

/**
 * Update alert
 */
async function updateAlert(alertId, updates) {
  try {
    const db = getSupabase();
    
    const { data, error } = await db
      .from('alerts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', alertId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

/**
 * Delete alert
 */
async function deleteAlert(alertId) {
  try {
    const db = getSupabase();
    
    const { error } = await db
      .from('alerts')
      .delete()
      .eq('id', alertId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Database error:', error);
    throw error;
  }
}

// ============================================
// DATABASE HEALTH CHECK
// ============================================

/**
 * Check database connection and health
 */
async function checkDatabaseHealth() {
  try {
    const db = getSupabase();
    
    const { error } = await db
      .from('api_users')
      .select('count', { count: 'exact', head: true })
      .limit(1);

    if (error) throw error;

    return {
      healthy: true,
      message: 'Database connection successful'
    };
  } catch (error) {
    console.error('Database health check failed:', error);
    return {
      healthy: false,
      message: error.message,
      error
    };
  }
}

/**
 * Initialize database (for testing)
 */
async function initDatabase() {
  try {
    const db = getSupabase();
    console.log('Database initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Export all functions
module.exports = {
  supabase: supabaseProxy,
  getSupabase,
  
  // User operations
  createUser,
  getUserByApiKey,
  
  // Product operations  
  createProduct,
  getProduct,
  getProducts,
  
  // Price operations
  updatePrice,
  getPriceHistory,
  
  // Alert operations
  createAlert,
  getAlerts,
  getAlertById,
  updateAlert,
  deleteAlert,
  
  // Health check
  checkDatabaseHealth,
  initDatabase
};