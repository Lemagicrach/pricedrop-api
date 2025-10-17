// lib/ebay-cached.js - eBay API with Caching to Avoid Rate Limits
const eBayAPI = require('./ebay');

class CachedEbayAPI extends eBayAPI {
  constructor(appId, environment) {
    super(appId, environment);
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
    this.requestCount = 0;
    this.maxRequestsPerMinute = 30; // Conservative limit
  }

  _getCacheKey(method, ...args) {
    return `${method}:${JSON.stringify(args)}`;
  }

  _getFromCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    console.log(`📦 Cache hit for: ${key.substring(0, 50)}...`);
    return cached.data;
  }

  _setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup old cache entries (keep last 100)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  async searchProducts(keywords, limit, options) {
    const cacheKey = this._getCacheKey('search', keywords, limit, options);
    const cached = this._getFromCache(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }
    
    // Call parent method
    const result = await super.searchProducts(keywords, limit, options);
    
    if (result.success) {
      this._setCache(cacheKey, result);
    }
    
    return result;
  }

  async getProductDetails(itemId) {
    const cacheKey = this._getCacheKey('details', itemId);
    const cached = this._getFromCache(cacheKey);
    
    if (cached) {
      return { ...cached, cached: true };
    }
    
    const result = await super.getProductDetails(itemId);
    
    if (result.success) {
      this._setCache(cacheKey, result);
    }
    
    return result;
  }

  clearCache() {
    this.cache.clear();
    console.log('✅ Cache cleared');
  }

  getCacheStats() {
    return {
      entries: this.cache.size,
      memory: `~${(this.cache.size * 2).toFixed(2)} KB`,
      ttl: `${this.cacheTTL / 1000} seconds`
    };
  }
}

module.exports = CachedEbayAPI;