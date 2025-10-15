// services/database-secure.js - Database operations with security fixes
const { createClient } = require('@supabase/supabase-js');
const { generateApiKey, hashApiKey, verifyApiKey, createLookupHash } = require('./apiKeyService');

// ✅ SECURITY FIX: Fail if environment variables are missing
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  throw new Error(
    'Database configuration missing! Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.'
  );
}

// Initialize Supabase with connection pool settings
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  {
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
  }
);

// ============================================
// USER OPERATIONS WITH SECURE API KEYS
// ============================================

/**
 * Create a new user with secure API key
 */
async function createUser(userData) {
  try {
    // Generate new API key
    const apiKey = generateApiKey(userData.plan || 'free');
    
    // Hash the API key for storage
    const { hash, prefix } = hashApiKey(apiKey);
    
    // Create lookup hash for fast searching
    const lookupHash = createLookupHash(apiKey);
    
    // Store user with hashed API key
    const { data, error } = await supabase
      .from('api_users')
      .insert([{
        ...userData,
        api_key_hash: hash,
        api_key_prefix: prefix,
        api_key_lookup: lookupHash,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Return user data with the actual API key (only shown once!)
    return {
      ...data,
      api_key: apiKey, // Only returned on creation
      message: 'Save this API key - it will not be shown again!'
    };
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
}

/**
 * Get user by API key (with secure verification)
 */
async function getUserByApiKey(providedKey) {
  try {
    // Create lookup hash for quick search
    const lookupHash = createLookupHash(providedKey);
    
    // Find potential matches using lookup hash
    const { data: candidates, error } = await supabase
      .from('api_users')
      .select('*')
      .eq('api_key_lookup', lookupHash);

    if (error) throw error;
    if (!candidates || candidates.length === 0) return null;
    
    // Verify the actual API key against stored hashes
    for (const candidate of candidates) {
      if (verifyApiKey(providedKey, candidate.api_key_hash)) {
        // Don't return the hash to the client
        const { api_key_hash, ...safeUser } = candidate;
        return safeUser;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to get user by API key:', error);
    return null;
  }
}

/**
 * Rotate API key for a user
 */
async function rotateApiKey(userId) {
  try {
    // Get user
    const { data: user, error: userError } = await supabase
      .from('api_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) throw new Error('User not found');
    
    // Generate new API key
    const newApiKey = generateApiKey(user.plan);
    const { hash, prefix } = hashApiKey(newApiKey);
    const lookupHash = createLookupHash(newApiKey);
    
    // Update user with new hashed key
    const { data, error } = await supabase
      .from('api_users')
      .update({
        api_key_hash: hash,
        api_key_prefix: prefix,
        api_key_lookup: lookupHash,
        api_key_rotated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      new_api_key: newApiKey,
      message: 'API key rotated successfully. Save the new key!'
    };
  } catch (error) {
    console.error('Failed to rotate API key:', error);
    throw error;
  }
}

// ============================================
// PRODUCT OPERATIONS WITH VALIDATION
// ============================================

/**
 * Create or update product with input validation
 */
async function createProduct(productData) {
  try {
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
    const { data: existing } = await supabase
      .from('products')
      .select('*')
      .eq('url', sanitized.url)
      .single();

    if (existing) {
      // Update existing product
      const { data, error } = await supabase
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
    const { data, error } = await supabase
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

// ============================================
// ALERT OPERATIONS WITH ERROR RECOVERY
// ============================================

/**
 * Create alert with retry logic
 */
async function createAlertWithRetry(alertData, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { data, error } = await supabase
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
      lastError = error;
      console.error(`Alert creation attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
  
  throw new Error(`Failed to create alert after ${maxRetries} attempts: ${lastError.message}`);
}

// ============================================
// DATABASE HEALTH CHECK
// ============================================

/**
 * Check database connection and health
 */
async function checkDatabaseHealth() {
  try {
    // Test basic query
    const { error } = await supabase
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

// Export all functions
module.exports = {
  supabase,
  
  // User operations
  createUser,
  getUserByApiKey,
  rotateApiKey,
  
  // Product operations  
  createProduct,
  
  // Alert operations
  createAlertWithRetry,
  
  // Health check
  checkDatabaseHealth,
  
  // Re-export other functions you need from original database.js
  // Add them here as needed...
};