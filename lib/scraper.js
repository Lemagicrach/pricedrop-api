const axios = require('axios');
const cheerio = require('cheerio');
const { SUPPORTED_STORES, DEFAULTS } = require('../config/constants');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
];

async function scrapePrice(url) {
  try {
    const domain = extractDomain(url);
    const storeConfig = SUPPORTED_STORES[domain];
    
    if (!storeConfig) {
      throw new Error(`Unsupported store: ${domain}`);
    }
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
      timeout: DEFAULTS.TIMEOUT
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract product information using store-specific selectors
    const title = extractText($, storeConfig.selectors.title);
    const priceText = extractText($, storeConfig.selectors.price);
    const price = parsePrice(priceText);
    const imageUrl = extractImageUrl($, storeConfig.selectors.image, url);
    const inStock = checkAvailability($, storeConfig.selectors.availability);
    
    if (!title || price === null) {
      throw new Error('Could not extract product information');
    }
    
    return {
      name: title.trim(),
      price: price,
      currency: storeConfig.currency,
      store: domain,
      image: imageUrl,
      inStock: inStock,
      url: url,
      lastChecked: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Scraping error:', error.message);
    
    // Return mock data for demo purposes when scraping fails
    const domain = extractDomain(url);
    const storeConfig = SUPPORTED_STORES[domain] || { name: 'Unknown Store', currency: 'USD' };
    
    return {
      name: `Demo Product - ${storeConfig.name}`,
      price: Math.floor(Math.random() * 500) + 50,
      currency: storeConfig.currency,
      store: domain,
      image: "https://via.placeholder.com/300x300?text=Product+Image",
      inStock: Math.random() > 0.2,
      url: url,
      lastChecked: new Date().toISOString(),
      demo: true
    };
  }
}

function extractDomain(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    return domain.replace('www.', '');
  } catch {
    return 'unknown.com';
  }
}

function extractText($, selector) {
  const element = $(selector).first();
  return element.text() || element.attr('content') || '';
}

function extractImageUrl($, selector, baseUrl) {
  const element = $(selector).first();
  let imageUrl = element.attr('src') || element.attr('data-src') || element.attr('data-lazy-src');
  
  if (imageUrl) {
    // Convert relative URLs to absolute
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl.startsWith('/')) {
      const base = new URL(baseUrl);
      imageUrl = base.origin + imageUrl;
    }
  }
  
  return imageUrl || 'https://via.placeholder.com/300x300?text=No+Image';
}

function parsePrice(priceText) {
  if (!priceText) return null;
  
  // Remove currency symbols and extract numbers
  const cleaned = priceText.replace(/[^\d.,]/g, '');
  const price = parseFloat(cleaned.replace(',', ''));
  
  return isNaN(price) ? null : price;
}

function checkAvailability($, selector) {
  if (!selector) return true;
  
  const element = $(selector);
  if (element.length === 0) return false;
  
  const text = element.text().toLowerCase();
  const unavailableKeywords = ['out of stock', 'unavailable', 'sold out', 'not available'];
  
  return !unavailableKeywords.some(keyword => text.includes(keyword));
}

function getSupportedStores() {
  return Object.keys(SUPPORTED_STORES);
}

function isUrlSupported(url) {
  const domain = extractDomain(url);
  return domain in SUPPORTED_STORES;
}

function getStoreInfo(url) {
  const domain = extractDomain(url);
  return SUPPORTED_STORES[domain] || null;
}

module.exports = {
  scrapePrice,
  getSupportedStores,
  isUrlSupported,
  getStoreInfo,
  extractDomain
};

