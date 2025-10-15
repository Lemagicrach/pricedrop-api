// services/apiKeyService.js - Secure API Key Management
const crypto = require('crypto');

/**
 * Generate a secure API key
 * Format: prefix.random.signature
 * Example: pk_live_a8f3k2n5m9p1x7d4.b2c8e5
 */
function generateApiKey(plan = 'free', prefix = 'pk') {
  const env = process.env.NODE_ENV === 'production' ? 'live' : 'test';
  const random = crypto.randomBytes(12).toString('hex');
  const signature = crypto.randomBytes(3).toString('hex');
  
  return `${prefix}_${env}_${random}.${signature}`;
}

/**
 * Hash an API key for storage
 * Uses PBKDF2 with salt for security
 */
function hashApiKey(apiKey) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(apiKey, salt, 10000, 64, 'sha512').toString('hex');
  
  return {
    hash: `${salt}:${hash}`,
    prefix: apiKey.substring(0, 15) + '...' // Store prefix for identification
  };
}

/**
 * Verify an API key against stored hash
 */
function verifyApiKey(providedKey, storedHash) {
  if (!providedKey || !storedHash) return false;
  
  const [salt, originalHash] = storedHash.split(':');
  if (!salt || !originalHash) return false;
  
  const hash = crypto.pbkdf2Sync(providedKey, salt, 10000, 64, 'sha512').toString('hex');
  
  return hash === originalHash;
}

/**
 * Create a lookup hash for fast API key searching
 * Uses first 8 chars of SHA256 hash
 */
function createLookupHash(apiKey) {
  return crypto.createHash('sha256')
    .update(apiKey)
    .digest('hex')
    .substring(0, 8);
}

module.exports = {
  generateApiKey,
  hashApiKey,
  verifyApiKey,
  createLookupHash
};