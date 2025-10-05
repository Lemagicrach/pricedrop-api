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

function buildDemoProduct(config, url, reason = 'Live data unavailable') {
  const demo = config?.demoProduct || {};
  const fallbackPrice = typeof demo.price === 'number' ? demo.price : Number(demo.price);

  return {
    success: true,
    name: demo.name || `${config?.name || 'Store'} Product`,
    price: Number.isFinite(fallbackPrice) ? fallbackPrice : 0,
    currency: demo.currency || config?.currency || 'USD',
    store: config?.name || 'Unknown',
    url,
    image: demo.image || null,
    demo: true,
    note: reason,
    lastChecked: new Date().toISOString()
  };
}

async function scrapePrice(url) {

  const storeDomain = getStoreFromUrl(url);

  if (!storeDomain) {
    const error = new Error('Unsupported store');
    error.code = ERROR_CODES.UNSUPPORTED_STORE;
    throw error;
  }
  
  const config = getStoreConfig(storeDomain);

   if (!config) {
    const error = new Error('Missing store configuration');
    error.code = ERROR_CODES.INTERNAL_ERROR;
    throw error;
  }

  try {
    const { data } = await axios.get(url, requestConfig());
    const $ = cheerio.load(data);


    const priceText = $(config.selectors.price).first().text();
    const titleText = $(config.selectors.title).first().text();
    const imageUrl = $(config.selectors.image).first().attr('src') || null;

    const price = parsePrice(priceText);
    const title = titleText ? titleText.trim() : '';

    if (!Number.isFinite(price) || !title) {
      if (config.demoProduct) {
        return buildDemoProduct(
          config,
          url,
          'Fallback demo data used because price or title could not be parsed'
        );
      }

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
      demo: false,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
        if (config.demoProduct) {
      return buildDemoProduct(
        config,
        url,
        `Fallback demo data used because scraping failed: ${error.message}`
      );
    }

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