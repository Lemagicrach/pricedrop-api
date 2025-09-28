const axios = require('axios');
const cheerio = require('cheerio');
const {
  SUPPORTED_STORES,
  DEFAULTS,
  ERROR_CODES
} = require('../config/constants');

function getSupportedStores() {
  return Object.keys(SUPPORTED_STORES);
}

function getStoreConfig(domain) {
  return SUPPORTED_STORES[domain] || null;
}

function getStoreFromUrl(url) {
  try {
    const { hostname } = new URL(url);
    const normalizedHost = hostname.replace(/^www\./i, '');

    return getSupportedStores().find((domain) => {
      return (
        normalizedHost === domain ||
        normalizedHost.endsWith(`.${domain}`)
      );
    }) || null;
  } catch (error) {
    return null;
  }
}

function requestConfig() {
  return {
    headers: {
      'User-Agent': DEFAULTS.USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache'
    },
    timeout: DEFAULTS.TIMEOUT
  };
}

function parsePrice(priceText = '') {
  const sanitized = priceText.replace(/[^0-9.,]/g, '');

  if (!sanitized) {
    return null;
  }

  const commaCount = (sanitized.match(/,/g) || []).length;
  const dotCount = (sanitized.match(/\./g) || []).length;
  let normalized = sanitized;

  if (commaCount && dotCount) {
    if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = sanitized.replace(/,/g, '');
    }
  } else if (commaCount) {
    normalized = sanitized.replace(/,/g, '.');
  } else if (dotCount > 1) {
    normalized = sanitized.replace(/\.(?=\d{3}\b)/g, '');
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

async function scrapePrice(url) {
  
  const storeDomain = getStoreFromUrl(url);

  if (!storeDomain) {
    const error = new Error('Unsupported store');
    error.code = ERROR_CODES.UNSUPPORTED_STORE;
    throw error;
  }
  
 
  

  const config = getStoreConfig(storeDomain);

  try {
    const { data } = await axios.get(url, requestConfig());
    const $ = cheerio.load(data);

    

    const priceText = $(config.selectors.price).first().text();
    const titleText = $(config.selectors.title).first().text();
    const imageUrl = $(config.selectors.image).first().attr('src') || null;

    const price = parsePrice(priceText);
    const title = titleText ? titleText.trim() : '';

    if (!price || !title) {

      return {
        success: false,
        error: 'Unable to extract product data - website may be blocking requests',
        code: ERROR_CODES.SCRAPING_FAILED,
        store: config.name,
        url
      };
    }
    

    return {
      success: true,
      name: title,
      price,
      currency: config.currency || 'USD',
      store: config.name,
      url,
      image: imageUrl,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {

    return {
      success: false,
      error: error.message,
      code: ERROR_CODES.SCRAPING_FAILED,
      store: config.name,
      url
    };
  }

}

function isUrlSupported(url) {
  return Boolean(getStoreFromUrl(url));
}

module.exports = {
  scrapePrice,
  getSupportedStores,
  getStoreFromUrl,
  getStoreConfig,
  requestConfig,
  isUrlSupported
};