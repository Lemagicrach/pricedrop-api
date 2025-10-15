// lib/scraper.js - Web Scraper with Custom Error Classes
// Last updated: 2025-01-15

const axios = require('axios');
const cheerio = require('cheerio');
const {
  SUPPORTED_STORES,
  DEFAULTS,
  ERROR_CODES
} = require('../config/constants');

/**
 * Custom Error Classes
 */
class ScraperError extends Error {
  constructor(message, code = 'SCRAPER_ERROR', details = {}) {
    super(message);
    this.name = 'ScraperError';
    this.code = code;
    this.details = details;
  }
}

class UnsupportedStoreError extends ScraperError {
  constructor(url, supportedStores = []) {
    super(
      'This store is not supported',
      ERROR_CODES.UNSUPPORTED_STORE,
      {
        url,
        supportedStores,
        message: 'Please use a URL from Amazon, eBay, Walmart, Target, or BestBuy'
      }
    );
    this.name = 'UnsupportedStoreError';
  }
}

class ScrapingFailedError extends ScraperError {
  constructor(store, reason, url) {
    super(
      `Failed to scrape ${store}`,
      ERROR_CODES.SCRAPING_FAILED,
      { store, reason, url }
    );
    this.name = 'ScrapingFailedError';
  }
}

/**
 * Get list of supported store domains
 * @returns {Array<string>} Array of supported domains
 */
function getSupportedStores() {
  return Object.keys(SUPPORTED_STORES);
}

/**
 * Get store configuration by domain
 * @param {string} domain - Store domain
 * @returns {Object|null} Store configuration or null
 */
function getStoreConfig(domain) {
  return SUPPORTED_STORES[domain] || null;
}

/**
 * Extract store domain from URL
 * @param {string} url - Product URL
 * @returns {string|null} Store domain or null
 */
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

/**
 * Get HTTP request configuration
 * @returns {Object} Axios request config
 */
function requestConfig() {
  return {
    headers: {
      'User-Agent': DEFAULTS.USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      'DNT': '1'
    },
    timeout: DEFAULTS.TIMEOUT,
    maxRedirects: 5
  };
}

/**
 * Parse price from text string
 * @param {string} priceText - Raw price text
 * @returns {number|null} Parsed price or null
 */
function parsePrice(priceText = '') {
  const sanitized = priceText.replace(/[^0-9.,]/g, '');

  if (!sanitized) {
    return null;
  }

  const commaCount = (sanitized.match(/,/g) || []).length;
  const dotCount = (sanitized.match(/\./g) || []).length;
  let normalized = sanitized;

  // Handle different decimal separators
  if (commaCount && dotCount) {
    if (sanitized.lastIndexOf(',') > sanitized.lastIndexOf('.')) {
      // European format: 1.234,56
      normalized = sanitized.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56
      normalized = sanitized.replace(/,/g, '');
    }
  } else if (commaCount) {
    // Assume comma as decimal separator
    normalized = sanitized.replace(/,/g, '.');
  } else if (dotCount > 1) {
    // Multiple dots as thousand separators
    normalized = sanitized.replace(/\.(?=\d{3}\b)/g, '');
  }

  const value = parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Build demo product data as fallback
 * @param {Object} config - Store configuration
 * @param {string} url - Product URL
 * @param {string} reason - Reason for using demo data
 * @returns {Object} Demo product data
 */
function buildDemoProduct(config, url, reason = 'Live data unavailable') {
  const demo = config?.demoProduct || {};
  const fallbackPrice = typeof demo.price === 'number' ? demo.price : Number(demo.price);

  return {
    success: true,
    name: demo.name || `${config?.name || 'Store'} Product`,
    price: Number.isFinite(fallbackPrice) ? fallbackPrice : 99.99,
    currency: demo.currency || config?.currency || 'USD',
    store: config?.name || 'Unknown Store',
    url,
    image: demo.image || null,
    demo: true,
    note: reason,
    warning: 'This is demo data. Real scraping may be blocked by the website.',
    lastChecked: new Date().toISOString()
  };
}

/**
 * Main scraping function
 * @param {string} url - Product URL to scrape
 * @returns {Promise<Object>} Product data
 * @throws {UnsupportedStoreError} If store is not supported
 * @throws {ScrapingFailedError} If scraping fails
 */
async function scrapePrice(url) {
  const storeDomain = getStoreFromUrl(url);

  if (!storeDomain) {
    throw new UnsupportedStoreError(url, getSupportedStores());
  }
  
  const config = getStoreConfig(storeDomain);

  if (!config) {
    throw new ScraperError(
      'Store configuration missing',
      ERROR_CODES.INTERNAL_ERROR,
      { store: storeDomain }
    );
  }

  try {
    const { data } = await axios.get(url, requestConfig());
    const $ = cheerio.load(data);

    // Extract price
    const priceText = $(config.selectors.price).first().text();
    const price = parsePrice(priceText);

    // Extract title
    const titleText = $(config.selectors.title).first().text();
    const title = titleText ? titleText.trim() : '';

    // Extract image
    const imageUrl = $(config.selectors.image).first().attr('src') || 
                     $(config.selectors.image).first().attr('data-src') ||
                     null;

    // Validate extracted data
    if (!Number.isFinite(price) || !title) {
      if (config.demoProduct) {
        return buildDemoProduct(
          config,
          url,
          'Fallback to demo data: Could not extract price or title from webpage'
        );
      }

      throw new ScrapingFailedError(
        config.name,
        'Could not extract required product data (price or title)',
        url
      );
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
    // If it's already our custom error, re-throw it
    if (error instanceof ScraperError) {
      throw error;
    }

    // For network/axios errors, use demo data if available
    if (config.demoProduct) {
      return buildDemoProduct(
        config,
        url,
        `Fallback to demo data: ${error.message}`
      );
    }

    // Otherwise, throw a scraping failed error
    throw new ScrapingFailedError(
      config.name,
      error.message,
      url
    );
  }
}

/**
 * Check if URL is from a supported store
 * @param {string} url - URL to check
 * @returns {boolean} True if supported
 */
function isUrlSupported(url) {
  return Boolean(getStoreFromUrl(url));
}

module.exports = {
  // Main functions
  scrapePrice,
  getSupportedStores,
  getStoreFromUrl,
  getStoreConfig,
  isUrlSupported,
  
  // Utilities
  requestConfig,
  parsePrice,
  
  // Error classes
  ScraperError,
  UnsupportedStoreError,
  ScrapingFailedError
};