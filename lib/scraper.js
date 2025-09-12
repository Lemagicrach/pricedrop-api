import axios from 'axios';
import * as cheerio from 'cheerio';
import playwright from 'playwright-core';

// Enhanced scraping rules with multiple fallback selectors
const scrapingRules = {
  'amazon.com': {
    requiresJS: false,
    selectors: {
      price: [
        'span.a-price-whole',
        'span#priceblock_dealprice', 
        'span#priceblock_ourprice',
        'span.a-price.a-text-price.a-size-medium.apexPriceToPay',
        'span.a-price-range',
        'div[data-component-type="s-price-component"] span.a-price-whole',
        'span.a-price.reinventPricePriceToPayMargin.priceToPay'
      ],
      name: [
        'span#productTitle',
        'h1.a-size-large',
        'h1[data-automation-id="title"]'
      ],
      image: [
        'img#landingImage',
        'div.imgTagWrapper img',
        'img[data-old-hires]'
      ],
      availability: [
        'div#availability span',
        'span.a-size-medium.a-color-success',
        'div#availability_feature_div'
      ],
      currency: [
        'span.a-price-symbol',
        'span.priceBlockBuyingPriceString'
      ]
    },
    priceParser: (text) => {
      const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '');
      const price = parseFloat(cleaned);
      return isNaN(price) ? null : price;
    }
  },
  'bestbuy.com': {
    requiresJS: true,
    selectors: {
      price: [
        'div.priceView-hero-price span',
        'div.pricing-price__regular-price span',
        'span.sr-only:contains("current price")',
        'div[data-testid="customer-price"] span'
      ],
      name: [
        'h1.heading-5.v-fw-regular',
        'div.sku-title h1',
        'h1[class*="productName"]'
      ],
      image: [
        'img.primary-image',
        'button.thumbnail-button img',
        'img[class*="productImage"]'
      ],
      availability: [
        'button.add-to-cart-button',
        'button[data-testid="add-to-cart-button"]',
        'div.fulfillment-add-to-cart-button'
      ]
    },
    priceParser: (text) => {
      const cleaned = text.replace(/[^\d.]/g, '');
      const price = parseFloat(cleaned);
      return isNaN(price) ? null : price;
    }
  },
  'walmart.com': {
    requiresJS: false,
    selectors: {
      price: [
        'span.price-now',
        'span[itemprop="price"]',
        'span[data-testid="price-wrap"]',
        'div[data-testid="list-price"] span'
      ],
      name: [
        'h1.prod-ProductTitle',
        'h1[itemprop="name"]',
        'h1[data-testid="product-title"]'
      ],
      image: [
        'img.hover-zoom-hero-image',
        'img[data-testid="hero-image"]',
        'div.relative img'
      ],
      availability: [
        'button.prod-ProductCTA--primary',
        'button[data-testid="add-to-cart-button"]',
        'div.prod-product-cta-add-to-cart'
      ]
    },
    priceParser: (text) => {
      const cleaned = text.replace(/[^\d.]/g, '');
      const price = parseFloat(cleaned);
      return isNaN(price) ? null : price;
    }
  },
  'target.com': {
    requiresJS: true,
    selectors: {
      price: [
        'div[data-test="product-price"]',
        'span[data-test="product-price"]',
        'div.h-text-bold span'
      ],
      name: [
        'h1[data-test="product-title"]',
        'h1.h-display-flex'
      ],
      image: [
        'div[data-test="image-gallery-item"] img',
        'button[data-test="product-image"] img'
      ],
      availability: [
        'button[data-test="orderPickupButton"]',
        'button[data-test="shipItButton"]'
      ]
    },
    priceParser: (text) => {
      const cleaned = text.replace(/[^\d.]/g, '');
      const price = parseFloat(cleaned);
      return isNaN(price) ? null : price;
    }
  }
};

// Fallback/Generic selectors for unsupported sites
const genericSelectors = {
  price: [
    '[class*="price"]:visible',
    '[data-price]',
    'meta[property="product:price:amount"]',
    'span[itemprop="price"]'
  ],
  name: [
    'h1',
    'meta[property="og:title"]',
    '[itemprop="name"]'
  ],
  image: [
    'meta[property="og:image"]',
    'img[itemprop="image"]',
    'img.product-image'
  ]
};

// User agent rotation for avoiding detection
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const getRandomUserAgent = () => userAgents[Math.floor(Math.random() * userAgents.length)];

// Simple HTML scraping
async function scrapeWithAxios(url, rules) {
  const { data } = await axios.get(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    },
    timeout: 15000,
    maxRedirects: 5
  });

  const $ = cheerio.load(data);
  return extractDataFromHTML($, rules, url);
}

// JavaScript-rendered page scraping
async function scrapeWithPlaywright(url, rules) {
  let browser;
  try {
    browser = await playwright.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      userAgent: getRandomUserAgent()
    });
    
    const page = await context.newPage();
    
    // Block unnecessary resources
    await page.route('**/*.{png,jpg,jpeg,gif,svg,css,font,woff,woff2}', route => route.abort());
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Wait for price element
    try {
      await page.waitForSelector(rules.selectors.price[0], { timeout: 5000 });
    } catch (e) {
      // Continue even if selector not found
    }
    
    const html = await page.content();
    const $ = cheerio.load(html);
    
    return extractDataFromHTML($, rules, url);
  } finally {
    if (browser) await browser.close();
  }
}

// Extract data from HTML
function extractDataFromHTML($, rules, url) {
  let price = null;
  let name = 'Product';
  let image = null;
  let inStock = true;
  let currency = 'USD';
  
  // Extract price
  for (const selector of rules.selectors.price) {
    const elements = $(selector);
    if (elements.length) {
      for (let i = 0; i < elements.length; i++) {
        const text = $(elements[i]).text().trim();
        if (text) {
          price = rules.priceParser(text);
          if (price && !isNaN(price)) break;
        }
      }
      if (price) break;
    }
  }
  
  // Extract product name
  for (const selector of rules.selectors.name) {
    const element = $(selector).first();
    if (element.length) {
      const text = element.text().trim();
      if (text) {
        name = text.substring(0, 200);
        break;
      }
    }
  }
  
  // Extract image
  for (const selector of rules.selectors.image) {
    const element = $(selector).first();
    if (element.length) {
      image = element.attr('src') || element.attr('data-src') || element.attr('content');
      if (image) {
        if (!image.startsWith('http')) {
          const urlObj = new URL(url);
          image = urlObj.origin + (image.startsWith('/') ? '' : '/') + image;
        }
        break;
      }
    }
  }
  
  // Check availability
  if (rules.selectors.availability) {
    let availabilityFound = false;
    for (const selector of rules.selectors.availability) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().toLowerCase();
        inStock = !text.includes('out of stock') && 
                  !text.includes('unavailable') && 
                  !text.includes('sold out');
        availabilityFound = true;
        break;
      }
    }
    if (!availabilityFound) {
      // Check for out of stock indicators
      const pageText = $('body').text().toLowerCase();
      if (pageText.includes('out of stock') || 
          pageText.includes('currently unavailable')) {
        inStock = false;
      }
    }
  }
  
  // Extract currency if available
  if (rules.selectors.currency) {
    for (const selector of rules.selectors.currency) {
      const element = $(selector).first();
      if (element.length) {
        const symbol = element.text().trim();
        if (symbol === '$') currency = 'USD';
        else if (symbol === '€') currency = 'EUR';
        else if (symbol === '£') currency = 'GBP';
        break;
      }
    }
  }
  
  return {
    price,
    name,
    image,
    inStock,
    currency
  };
}

// Main scraping function
export const scrapePrice = async (url) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const siteKey = Object.keys(scrapingRules).find(key => domain.includes(key));
    const rules = siteKey ? scrapingRules[siteKey] : null;
    
    if (!rules) {
      // Use generic scraping for unsupported sites
      console.log(`Unsupported site ${domain}, attempting generic scraping`);
      const { data } = await axios.get(url, {
        headers: { 'User-Agent': getRandomUserAgent() },
        timeout: 15000
      });
      
      const $ = cheerio.load(data);
      const genericRules = {
        selectors: genericSelectors,
        priceParser: (text) => {
          const cleaned = text.replace(/[^\d.,]/g, '').replace(',', '');
          return parseFloat(cleaned);
        }
      };
      
      const result = extractDataFromHTML($, genericRules, url);
      if (!result.price) {
        throw new Error('Could not extract price from page');
      }
      
      return {
        ...result,
        store: domain,
        scrapedAt: new Date().toISOString()
      };
    }
    
    // Use appropriate scraping method
    let result;
    if (rules.requiresJS && process.env.ENABLE_PLAYWRIGHT === 'true') {
      result = await scrapeWithPlaywright(url, rules);
    } else {
      result = await scrapeWithAxios(url, rules);
    }
    
    if (!result.price) {
      throw new Error('Could not extract price from page');
    }
    
    return {
      ...result,
      store: domain,
      scrapedAt: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Scraping error:', error);
    
    // Return a more informative error
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}