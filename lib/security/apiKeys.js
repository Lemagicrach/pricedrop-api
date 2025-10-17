// lib/security/apiKeys.js - Secure API Key Management
const crypto = require('crypto');
const { supabase } = require('../services/database');

/**
 * Generate a secure API key with proper prefix
 * @param {string} type - Key type: 'live' or 'test'
 * @returns {string} A secure API key with prefix
 */
function generateApiKey(type = 'live') {
  // Generate 24 bytes = 32 base64url characters
  const randomBytes = crypto.randomBytes(24);
  const randomString = randomBytes.toString('base64url').replace(/[=]/g, '');
  
  // Ensure we have exactly 32 characters
  const paddedString = (randomString + crypto.randomBytes(16).toString('base64url'))
    .replace(/[=]/g, '')
    .substring(0, 32);
  
  return `pda_${type}_${paddedString}`;
}

/**
 * Hash an API key for secure storage
 * @param {string} apiKey - The API key to hash
 * @returns {string} Hashed API key
 */
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Validate API key format
 * @param {string} key - The API key to validate
 * @returns {boolean} Whether the key format is valid
 */
function isValidKeyFormat(key) {
  if (!key || typeof key !== 'string') return false;
  
  // Check for valid prefix and length
  const validPrefixes = ['pda_live_', 'pda_test_'];
  const hasValidPrefix = validPrefixes.some(prefix => key.startsWith(prefix));
  
  if (!hasValidPrefix) return false;
  
  // Check if the key matches the expected pattern
  const pattern = /^pda_(live|test)_[A-Za-z0-9_-]{32}$/;
  return pattern.test(key);
}

/**
 * Validate an API key against the database
 * @param {string} apiKey - The API key to validate
 * @returns {Promise<boolean>} Whether the API key is valid
 */
async function validateApiKey(apiKey) {
  if (!apiKey || !isValidKeyFormat(apiKey)) return false;
  
  try {
    const hashedKey = hashApiKey(apiKey);
    
    const { data, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', hashedKey)
      .eq('is_active', true)
      .single();
    
    if (error || !data) return false;
    
    // Update last_used timestamp
    await supabase
      .from('api_keys')
      .update({ last_used: new Date().toISOString() })
      .eq('key_hash', hashedKey);
    
    return true;
  } catch (error) {
    console.error('Error validating API key:', error);
    return false;
  }
}

/**
 * Create a new API key for a user
 * @param {string} userId - The user ID
 * @param {string} name - Name/description for the API key
 * @param {string} type - Key type: 'live' or 'test'
 * @returns {Promise<Object>} The created API key record
 */
async function createApiKey(userId, name = 'Default API Key', type = 'live') {
  const apiKey = generateApiKey(type);
  const hashedKey = hashApiKey(apiKey);
  
  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      key_hash: hashedKey,
      key_prefix: apiKey.substring(0, 12), // Store prefix for identification
      user_id: userId,
      name,
      type,
      is_active: true,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`);
  }
  
  // Return the data with the actual key (only shown once)
  return { ...data, key: apiKey };
}

/**
 * Revoke an API key
 * @param {string} apiKey - The API key to revoke
 * @returns {Promise<boolean>} Success status
 */
async function revokeApiKey(apiKey) {
  if (!isValidKeyFormat(apiKey)) return false;
  
  const hashedKey = hashApiKey(apiKey);
  
  const { error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('key_hash', hashedKey);
  
  return !error;
}

module.exports = {
  generateApiKey,
  hashApiKey,
  isValidKeyFormat,
  validateApiKey,
  createApiKey,
  revokeApiKey,
};