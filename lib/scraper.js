const axios = require('axios');
const cheerio = require('cheerio');

// Store configurations
const STORES = {
  'ebay.com': {
    name: 'eBay',
    priceSelectors: ['.x-price-primary span', '.x-bin-price__content', '.vi-VR-cvipPrice'],
    titleSelectors: ['.x-item-title__mainTitle', '.it-ttl', 'h1.it-ttl'],
    imageSelectors: ['.ux-image-carousel-item img', '.vi-image-gallery__image img'],
    stockSelector: '.vi-acc-del-range',
    needsHeaders: false
  },
  'walmart.com': {
    name: 'Walmart',
    priceSelectors: ['[itemprop="price"]', '.price-now', 'span.price-characteristic'],
    titleSelectors: ['h1[itemprop="name"]', 'h1.prod-ProductTitle'],
    imageSelectors: ['img.hover-zoom-hero-image', '[data-testid="hero-image"] img'],
    stockSelector: '.prod-ProductOffer-oosMsg',
    needsHeaders: true
  },
  'bestbuy.com': {
    name: 'BestBuy',
    priceSelectors: ['.priceView-customer-price span', '.pricing-price__regular-price'],
    titleSelectors: ['.heading-5', 'h1.heading'],
    imageSelectors: ['.primary-image img', '.shop-media-gallery img'],
    stockSelector: '.fulfillment-add-to-cart-button',
    needsHeaders: true
  },
  'target.com': {
    name: 'Target',
    priceSelectors: ['[data-test="product-price"]', '.styles__CurrentPrice'],
    titleSelectors: ['[data-test="product-title"]', 'h1[itemprop="name"]'],
    imageSelectors: ['[data-test="product-image"] img'],
    stockSelector: '[data-test="shipItButton"]',
    needsHeaders: true
  },
  'amazon.com': {
    name: 'Amazon',
    priceSelectors: ['.a-price-whole', '.a-price.a-text-price.a-size-medium', '#priceblock_dealprice'],
    titleSelectors: ['#productTitle', 'h1.a-size-large'],
    imageSelectors: ['#landingImage', '#imgTagWrapperId img'],
    stockSelector: '#availability span',
    needsHeaders: true
  }
};

// Get supported stores
function getSupportedStores() {
  return Object.keys(STORES).map(domain => ({
    domain,
    name: STORES[domain].name
  }));
}

// Check if URL is supported
function isUrlSupported(url) {
  return Object.keys(STORES).some(store => url.includes(store));
}

// Extract store from URL
function getStoreFromUrl(url) {
  return Object.keys(STORES).find(store => url.includes(store));
}

// Main scraping function
async function scrapePrice(url) {
  const store = getStoreFromUrl(url);
  
  if (!store) {
    throw new Error('Unsupported store');
  }
  
  const config = STORES[store];
  
  try {
    // Headers to avoid blocking
    const requestConfig = {
      headers: config.needsHeaders ? {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      } : {},
      timeout: 10000,
      maxRedirects: 5
    };
    
    // Fetch the page
    const { data } = await axios.get(url, requestConfig);
    const $ = cheerio.load(data);
    
    // Extract price
    let price = null;
    for (const selector of config.priceSelectors) {
      const element = $(selector).first();
      if (element.length) {
        let priceText = element.text().trim();
        // Clean the price
        priceText = priceText.replace(/[^0-9.,]/g, '');
        if (priceText) {
          price = parseFloat(priceText.replace(',', ''));
          if (!isNaN(price)) break;
        }
      }
    }
    
    // Extract title
    let title = null;
    for (const selector of config.titleSelectors) {
      const element = $(selector).first();
      if (element.length) {
        title = element.text().trim();
        if (title) break;
      }
    }
    
    // Extract image
    let image = null;
    for (const selector of config.imageSelectors) {
      const element = $(selector).first();
      if (element.length) {
        image = element.attr('src') || element.attr('data-src');
        if (image && !image.startsWith('http')) {
          image = 'https:' + image;
        }
        if (image) break;
      }
    }
    
    // Check stock (basic check)
    let inStock = true;
    if (config.stockSelector) {
      const stockElement = $(config.stockSelector);
      if (stockElement.text().toLowerCase().includes('out of stock') ||
          stockElement.text().toLowerCase().includes('unavailable')) {
        inStock = false;
      }
    }
    
    // If we couldn't get price or title, it might be blocked
    if (!price || !title) {
      console.log('Scraping might be blocked or selectors outdated');
      // Return demo data for testing
      return {
        name: title || 'Product Name (Demo Mode)',
        price: price || 99.99,
        currency: 'USD',
        store: config.name,
        image: image || 'https://via.placeholder.com/200',
        inStock: inStock,
        url: url,
        lastChecked: new Date().toISOString(),
        demo: true // Flag to indicate this is demo data
      };
    }
    
    return {
      name: title.substring(0, 200),
      price: price,
      currency: 'USD',
      store: config.name,
      image: image,
      inStock: inStock,
      url: url,
      lastChecked: new Date().toISOString(),
      demo: false
    };
    
  } catch (error) {
    console.error(`Scraping error for ${store}:`, error.message);
    
    // Return demo data on error
    return {
      name: 'Sample Product (Error - Demo Mode)',
      price: 49.99,
      currency: 'USD',
      store: config.name,
      image: 'https://via.placeholder.com/200',
      inStock: true,
      url: url,
      lastChecked: new Date().toISOString(),
      demo: true,
      error: error.message
    };
  }
}

module.exports = {
  scrapePrice,
  isUrlSupported,
  getSupportedStores,
  getStoreFromUrl
};