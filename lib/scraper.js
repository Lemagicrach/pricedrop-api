async function scrapePrice(url) {
  const store = getStoreFromUrl(url);
  
  if (!store) {
    throw new Error('Unsupported store');
  }
  
  const config = STORES[store];
  
  try {
    const { data } = await axios.get(url, requestConfig);
    const $ = cheerio.load(data);
    
    // ... extraction logic ...
    
    if (!price || !title) {
      // Return error, not fake data
      return {
        success: false,
        error: 'Unable to extract product data - website may be blocking requests',
        store: config.name,
        url: url
      };
    }
    
    return {
      success: true,
      name: title,
      price: price,
      currency: 'USD',
      store: config.name,
      url: url,
      lastChecked: new Date().toISOString()
    };
    
  } catch (error) {
    // Return error, not fake data
    return {
      success: false,
      error: error.message,
      store: config.name,
      url: url
    };
  }
}