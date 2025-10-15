// Create services/cache.js
class SimpleCache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }
  
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
}

const productCache = new SimpleCache(300000); // 5 min cache

// Use in getProduct
async function getProduct(id) {
  const cacheKey = `product_${id}`;
  const cached = productCache.get(cacheKey);
  
  if (cached) return cached;
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    productCache.set(cacheKey, data);
    return data;
  } catch (error) {
    console.error('Database error:', error);
    return null;
  }
}