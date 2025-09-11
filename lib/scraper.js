import axios from 'axios';
import * as cheerio from 'cheerio';

const scrapingRules = {
  'amazon.com': {
    selectors: {
      price: ['span.a-price-whole', 'span#priceblock_dealprice', 'span#priceblock_ourprice', 'span.a-price.a-text-price.a-size-medium.apexPriceToPay', 'span.a-price-range'],
      name: ['span#productTitle', 'h1.a-size-large'],
      image: ['img#landingImage', 'div.imgTagWrapper img'],
      availability: ['div#availability span', 'span.a-size-medium.a-color-success']
    },
    priceParser: (text) => {
      const price = text.replace(/[^0-9.,]/g, '').replace(',', '');
      return parseFloat(price);
    }
  },
  'bestbuy.com': {
    selectors: {
      price: ['div.priceView-hero-price span', 'div.pricing-price__regular-price span'],
      name: ['h1.heading-5.v-fw-regular'],
      image: ['img.primary-image'],
      availability: ['button.add-to-cart-button']
    },
    priceParser: (text) => {
      const price = text.replace(/[^0-9.]/g, '');
      return parseFloat(price);
    }
  },
  'walmart.com': {
    selectors: {
      price: ['span.price-now', 'span[itemprop="price"]'],
      name: ['h1.prod-ProductTitle'],
      image: ['img.hover-zoom-hero-image'],
      availability: ['button.prod-ProductCTA--primary']
    },
    priceParser: (text) => {
      const price = text.replace(/[^0-9.]/g, '');
      return parseFloat(price);
    }
  }
};

export const scrapePrice = async (url) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    const rules = Object.keys(scrapingRules).find(key => domain.includes(key));
    
    if (!rules) {
      throw new Error('Unsupported website for scraping');
    }

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const rule = scrapingRules[rules];
    
    // Extract price
    let price = null;
    for (const selector of rule.selectors.price) {
      const element = $(selector).first();
      if (element.length) {
        const priceText = element.text().trim();
        price = rule.priceParser(priceText);
        if (price && !isNaN(price)) break;
      }
    }

    // Extract name
    let name = 'Product';
    for (const selector of rule.selectors.name) {
      const element = $(selector).first();
      if (element.length) {
        name = element.text().trim().substring(0, 200);
        break;
      }
    }

    // Extract image
    let image = null;
    for (const selector of rule.selectors.image) {
      const element = $(selector).first();
      if (element.length) {
        image = element.attr('src') || element.attr('data-src');
        if (image && !image.startsWith('http')) {
          image = new URL(image, url).href;
        }
        break;
      }
    }

    // Check availability
    let inStock = true;
    for (const selector of rule.selectors.availability) {
      const element = $(selector).first();
      if (element.length) {
        const text = element.text().toLowerCase();
        inStock = !text.includes('out of stock') && !text.includes('unavailable');
        break;
      }
    }

    if (!price) {
      throw new Error('Could not extract price from page');
    }

    return {
      price,
      name,
      image,
      inStock,
      currency: 'USD',
      store: domain,
      scrapedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape price: ${error.message}`);
  }
};
