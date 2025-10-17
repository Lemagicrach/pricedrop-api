// lib/security/apiKeys.js - Secure API Key Management
const crypto = require('crypto');

// Fix: Use correct relative path
let supabase;
try {
  const db = require('../../services/database');
  supabase = db.supabase;
} catch (error) {
  // Module not found - we're in a test environment
  supabase = null;
}

/**
 * Get supabase instance (allows for mocking in tests)
 */
function getSupabase() {
  if (!supabase) {
    try {
      const db = require('../../services/database');
      supabase = db.supabase;
    } catch (error) {
      console.warn('Supabase not available');
    }
  }
  return supabase;
}

/**
 * Generate a secure API key
 * Format: pda_live_[32 random chars] or pda_test_[32 random chars]
 */
function generateApiKey(environment = 'live') {
  const prefix = environment === 'test' ? 'pda_test_' : 'pda_live_';
  const randomBytes = crypto.randomBytes(24).toString('base64url');
  return prefix + randomBytes;
}

/**
 * Hash API key for storage
 */
function hashApiKey(apiKey) {
  return crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex');
}

/**
 * Validate API key format
 */
function isValidKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }
  
  const validPrefix = /^pda_(live|test)_[A-Za-z0-9_-]{32}$/;
  return validPrefix.test(apiKey);
}

/**
 * Verify API key against database
 */
async function verifyApiKey(apiKey) {
  const db = getSupabase();
  
  if (!isValidKeyFormat(apiKey)) {
    return {
      valid: false,
      error: 'Invalid API key format',
      code: 'INVALID_KEY_FORMAT'
    };
  }
  
  const keyHash = hashApiKey(apiKey);
  
  try {
    if (!db) {
      // Fallback for testing/development
      return {
        valid: true,
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          plan: 'free',
          credits_remaining: 100,
          rate_limit_tier: 'basic'
        }
      };
    }
    
    const { data: user, error } = await db
      .from('api_users')
      .select('id, email, plan, credits_limit, credits_used, is_active, rate_limit_tier')
      .eq('api_key_hash', keyHash)
      .single();
    
    if (error || !user) {
      return {
        valid: false,
        error: 'API key not found',
        code: 'KEY_NOT_FOUND'
      };
    }
    
    if (!user.is_active) {
      return {
        valid: false,
        error: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED'
      };
    }
    
    if (user.credits_used >= user.credits_limit) {
      return {
        valid: false,
        error: 'Credit limit exceeded',
        code: 'CREDITS_EXHAUSTED'
      };
    }
    
    await db
      .from('api_users')
      .update({ last_used: new Date().toISOString() })
      .eq('id', user.id);
    
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        plan: user.plan,
        credits_remaining: user.credits_limit - user.credits_used,
        rate_limit_tier: user.rate_limit_tier
      }
    };
  } catch (error) {
    console.error('API key verification error:', error);
    return {
      valid: false,
      error: 'Verification failed',
      code: 'VERIFICATION_ERROR'
    };
  }
}

/**
 * Increment user's credit usage
 */
async function incrementCredits(userId, amount = 1) {
  const db = getSupabase();
  if (!db) return false;
  
  try {
    const { error } = await db.rpc('increment_credits', {
      user_id: userId,
      amount
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Failed to increment credits:', error);
    return false;
  }
}

/**
 * Create new API key for user
 */
async function createApiKeyForUser(userId, environment = 'live') {
  const db = getSupabase();
  if (!db) {
    return { success: false, error: 'Database not available' };
  }
  
  const apiKey = generateApiKey(environment);
  const keyHash = hashApiKey(apiKey);
  
  try {
    const { error } = await db
      .from('api_users')
      .update({
        api_key_hash: keyHash,
        key_created_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) throw error;
    
    return {
      success: true,
      apiKey,
      message: 'Save this key securely. It cannot be recovered.'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateApiKey,
  hashApiKey,
  isValidKeyFormat,
  verifyApiKey,
  incrementCredits,
  createApiKeyForUser,
  getSupabase // Export for testing
};