// services/cache-fixed.js - Cache service with automatic cleanup
class SimpleCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 1000; // Max items in cache
    this.cleanupInterval = options.cleanupInterval || 60000; // Cleanup every minute
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      cleanups: 0
    };
    
    // Start automatic cleanup
    this.startCleanup();
  }
  
  /**
   * Start periodic cleanup
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    // Ensure cleanup stops when process exits
    process.on('beforeExit', () => this.stopCleanup());
  }
  
  /**
   * Stop cleanup interval
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
  
  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    // Also enforce max size
    if (this.cache.size > this.maxSize) {
      const toRemove = this.cache.size - this.maxSize;
      const entries = Array.from(this.cache.entries());
      
      // Sort by expiry time and remove oldest
      entries.sort((a, b) => a[1].expires - b[1].expires);
      
      for (let i = 0; i < toRemove; i++) {
        this.cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    }
    
    this.stats.cleanups++;
    
    if (cleaned > 0 || this.stats.evictions > 0) {
      console.log(`[Cache] Cleanup: removed ${cleaned} expired, ${this.stats.evictions} evicted, size: ${this.cache.size}`);
    }
    
    return cleaned;
  }
  
  /**
   * Set a cache entry
   */
  set(key, value, customTTL = null) {
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.stats.evictions++;
    }
    
    this.cache.set(key, {
      value,
      expires: Date.now() + (customTTL || this.ttl),
      created: Date.now(),
      hits: 0
    });
    
    return true;
  }
  
  /**
   * Get a cache entry
   */
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update hit count
    item.hits++;
    this.stats.hits++;
    
    return item.value;
  }
  
  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Delete a specific key
   */
  delete(key) {
    return this.cache.delete(key);
  }
  
  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    console.log('[Cache] All entries cleared');
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    
    for (const item of this.cache.values()) {
      if (now > item.expires) expired++;
    }
    
    return {
      ...this.stats,
      size: this.cache.size,
      expired,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
      memoryUsage: `${(this.cache.size * 0.5).toFixed(2)} KB (estimated)`
    };
  }
}

// ============================================
// SPECIALIZED CACHES
// ============================================

/**
 * Product cache with smart invalidation
 */
class ProductCache extends SimpleCache {
  constructor() {
    super({
      ttl: 300000, // 5 minutes
      maxSize: 500,
      cleanupInterval: 60000
    });
  }
  
  generateKey(productId) {
    return `product:${productId}`;
  }
  
  async getProduct(productId, fetchFn) {
    const key = this.generateKey(productId);
    
    // Try cache first
    const cached = this.get(key);
    if (cached) return cached;
    
    // Fetch from database
    try {
      const product = await fetchFn(productId);
      if (product) {
        this.set(key, product);
      }
      return product;
    } catch (error) {
      console.error('Failed to fetch product:', error);
      return null;
    }
  }
  
  invalidateProduct(productId) {
    const key = this.generateKey(productId);
    this.delete(key);
  }
}

/**
 * Price history cache
 */
class PriceHistoryCache extends SimpleCache {
  constructor() {
    super({
      ttl: 600000, // 10 minutes
      maxSize: 200,
      cleanupInterval: 120000
    });
  }
  
  generateKey(productId, days) {
    return `history:${productId}:${days}`;
  }
}

/**
 * User cache for API key lookups
 */
class UserCache extends SimpleCache {
  constructor() {
    super({
      ttl: 3600000, // 1 hour
      maxSize: 1000,
      cleanupInterval: 300000 // 5 minutes
    });
  }
  
  generateKey(apiKeyHash) {
    return `user:${apiKeyHash}`;
  }
}

// Create singleton instances
const productCache = new ProductCache();
const priceHistoryCache = new PriceHistoryCache();
const userCache = new UserCache();

// Export everything
module.exports = {
  SimpleCache,
  ProductCache,
  PriceHistoryCache,
  UserCache,
  
  // Singleton instances
  productCache,
  priceHistoryCache,
  userCache
};