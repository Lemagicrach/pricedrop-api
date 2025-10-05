// services/productScraper.js - Real product data extraction from multiple stores
const axios = require('axios');
const cheerio = require('cheerio');

// Main scraper function
async function extractProductInfo(url) {
  try {
    const store = detectStore(url);
    
    if (!store) {
      return { success: false, error: 'Unsupported store URL' };
    }

    // Route to appropriate scraper
    switch (store) {
      case 'ebay':
        return await scrapeEbay(url);
      case 'amazon':
      case 'amazon_uk':
        return await scrapeAmazon(url);
      case 'bestbuy':
        return await scrapeBestBuy(url);
      case 'walmart':
        return await scrapeWalmart(url);
      case 'target':
        return await scrapeTarget(url);
      case 'newegg':
        return await scrapeNewegg(url);
      default:
        return { success: false, error: 'Store scraper not implemented' };
    }
  } catch (error) {
    console.error('Scraping error:', error);
    return { 
      success: false, 
      error: 'Failed to extract product information',
      details: error.message 
    };
  }
}

// eBay Scraper - Using eBay Finding API
async function scrapeEbay(url) {
  try {
    // Extract item ID from URL
    const itemId = extractEbayItemId(url);
    if (!itemId) {
      return { success: false, error: 'Invalid eBay URL format' };
    }

    // Use eBay Finding API (replace with your app ID)
    const ebayApiUrl = `https://open.api.ebay.com/shopping`;
    const params = {
      callname: 'GetSingleItem',
      responseencoding: 'JSON',
      appid: process.env.EBAY_APP_ID || 'YourEbayAppId',
      siteid: '0',
      version: '1157',
      ItemID: itemId,
      IncludeSelector: 'Details,ItemSpecifics,Variations'
    };

    const response = await axios.get(ebayApiUrl, { params });
    const item = response.data.Item;

    if (!item) {
      return { success: false, error: 'Product not found' };
    }

    return {
      success: true,
      title: item.Title,
      price: parseFloat(item.CurrentPrice?.Value || 0),
      original_price: parseFloat(item.CurrentPrice?.Value || 0),
      currency: item.CurrentPrice?.CurrencyID || 'USD',
      in_stock: item.Quantity > 0,
      image: item.PictureURL?.[0] || item.GalleryURL,
      sku: itemId,
      url: url,
      seller: item.Seller?.UserID,
      condition: item.ConditionDisplayName,
      shipping: item.ShippingCostSummary?.ShippingServiceCost?.Value || 0,
      rating: parseFloat(item.Seller?.FeedbackScore || 0),
      review_count: item.Seller?.FeedbackScore || 0,
      description: item.Description?.substring(0, 500)
    };
  } catch (error) {
    // Fallback to web scraping if API fails
    return await scrapeEbayWeb(url);
  }
}

// eBay Web Scraper Fallback
async function scrapeEbayWeb(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);
    
    // Extract price
    let price = $('.x-price-primary .ux-textspans').text() || 
                $('.x-bin-price__content .ux-textspans').text() ||
                $('[data-testid="x-price-primary"]').text();
    price = parseFloat(price.replace(/[^0-9.]/g, ''));

    return {
      success: true,
      title: $('h1.it-ttl').text() || $('[data-testid="x-item-title"]').text(),
      price: price,
      original_price: price,
      currency: 'USD',
      in_stock: !$('.vi-acc-del-range').text().includes('Out of stock'),
      image: $('img#icImg').attr('src') || $('.ux-image-carousel img').first().attr('src'),
      sku: extractEbayItemId(url),
      url: url,
      condition: $('.u-flL.condText').text() || 'Unknown',
      seller: $('.mbg-nw').text() || $('.ux-seller-section__item--seller').text(),
      shipping: $('.vi-acc-del-range').text() || 'Calculate at checkout'
    };
  } catch (error) {
    return { success: false, error: 'Failed to scrape eBay page' };
  }
}

// Amazon Scraper (Note: Amazon requires more sophisticated scraping)
async function scrapeAmazon(url) {
  try {
    // Amazon actively blocks scraping, so we need special handling
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      }
    });

    const $ = cheerio.load(response.data);

    // Multiple selectors for different Amazon layouts
    let price = $('span.a-price-whole').first().text() ||
                $('span.a-price.a-text-price.a-size-medium.apexPriceToPay').text() ||
                $('span.a-price-range').first().text();
    price = parseFloat(price.replace(/[^0-9.]/g, ''));

    const originalPrice = $('span.a-price.a-text-price[data-a-strike="true"]').first().text();

    return {
      success: true,
      title: $('#productTitle').text().trim(),
      price: price,
      original_price: originalPrice ? parseFloat(originalPrice.replace(/[^0-9.]/g, '')) : price,
      currency: 'USD',
      in_stock: !$('#availability span').text().includes('Currently unavailable'),
      image: $('#landingImage').attr('src') || $('#imgTagWrapperId img').attr('src'),
      sku: extractAmazonASIN(url),
      url: url,
      rating: parseFloat($('span.a-icon-alt').first().text().split(' ')[0]) || 0,
      review_count: parseInt($('#acrCustomerReviewText').text().replace(/[^0-9]/g, '')) || 0,
      prime: $('.a-icon-prime').length > 0
    };
  } catch (error) {
    return { 
      success: false, 
      error: 'Amazon scraping requires advanced setup. Consider using Amazon PA-API.',
      suggestion: 'Apply for Amazon Product Advertising API for reliable data access'
    };
  }
}

// BestBuy Scraper
async function scrapeBestBuy(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract structured data if available
    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
      const data = JSON.parse(jsonLd);
      if (data['@type'] === 'Product') {
        return {
          success: true,
          title: data.name,
          price: parseFloat(data.offers?.price || 0),
          original_price: parseFloat(data.offers?.price || 0),
          currency: data.offers?.priceCurrency || 'USD',
          in_stock: data.offers?.availability === 'http://schema.org/InStock',
          image: data.image,
          sku: data.sku || extractBestBuySKU(url),
          url: url,
          rating: data.aggregateRating?.ratingValue || 0,
          review_count: data.aggregateRating?.reviewCount || 0,
          brand: data.brand?.name
        };
      }
    }

    // Fallback to HTML scraping
    let price = $('.pricing-price__regular-price').text() ||
                $('.priceView-hero-price span').first().text();
    price = parseFloat(price.replace(/[^0-9.]/g, ''));

    return {
      success: true,
      title: $('h1.heading-5').text().trim(),
      price: price,
      original_price: price,
      currency: 'USD',
      in_stock: !$('.fulfillment-add-to-cart-button button').attr('disabled'),
      image: $('.primary-image img').attr('src'),
      sku: extractBestBuySKU(url),
      url: url
    };
  } catch (error) {
    return { success: false, error: 'Failed to scrape BestBuy' };
  }
}

// Walmart Scraper
async function scrapeWalmart(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Look for Next.js data
    const scriptData = $('#__NEXT_DATA__').html();
    if (scriptData) {
      const data = JSON.parse(scriptData);
      const product = data.props?.pageProps?.initialData?.data?.product;
      
      if (product) {
        return {
          success: true,
          title: product.name,
          price: parseFloat(product.priceInfo?.currentPrice?.price || 0),
          original_price: parseFloat(product.priceInfo?.wasPrice?.price || product.priceInfo?.currentPrice?.price || 0),
          currency: product.priceInfo?.currentPrice?.currency || 'USD',
          in_stock: product.availabilityStatus === 'IN_STOCK',
          image: product.imageInfo?.thumbnailUrl,
          sku: product.id,
          url: url,
          rating: product.averageRating || 0,
          review_count: product.numberOfReviews || 0
        };
      }
    }

    // Fallback to HTML scraping
    return {
      success: true,
      title: $('[itemprop="name"]').text() || $('h1').first().text(),
      price: parseFloat($('[itemprop="price"]').attr('content') || '0'),
      currency: 'USD',
      in_stock: true,
      url: url
    };
  } catch (error) {
    return { success: false, error: 'Failed to scrape Walmart' };
  }
}

// Target Scraper
async function scrapeTarget(url) {
  try {
    // Target uses heavy client-side rendering, making scraping difficult
    // Best approach is to use their API or Puppeteer for full rendering
    return {
      success: false,
      error: 'Target requires advanced scraping with Puppeteer',
      suggestion: 'Use headless browser or Target API for reliable data'
    };
  } catch (error) {
    return { success: false, error: 'Failed to scrape Target' };
  }
}

// Newegg Scraper
async function scrapeNewegg(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    let price = $('.price-current').text();
    price = parseFloat(price.replace(/[^0-9.]/g, ''));

    return {
      success: true,
      title: $('h1.product-title').text().trim(),
      price: price,
      original_price: parseFloat($('.price-was').text().replace(/[^0-9.]/g, '')) || price,
      currency: 'USD',
      in_stock: $('.product-inventory').text().includes('In Stock'),
      image: $('.product-view-img-original img').attr('src'),
      sku: extractNeweggItem(url),
      url: url,
      rating: parseFloat($('.product-rating').attr('title')?.split(' ')[0]) || 0,
      review_count: parseInt($('.product-review-count').text().replace(/[^0-9]/g, '')) || 0
    };
  } catch (error) {
    return { success: false, error: 'Failed to scrape Newegg' };
  }
}

// Helper functions
function detectStore(url) {
  const stores = {
    'ebay.com': 'ebay',
    'amazon.com': 'amazon',
    'amazon.co.uk': 'amazon_uk',
    'bestbuy.com': 'bestbuy',
    'walmart.com': 'walmart',
    'target.com': 'target',
    'newegg.com': 'newegg'
  };

  for (const [domain, store] of Object.entries(stores)) {
    if (url.includes(domain)) {
      return store;
    }
  }
  return null;
}

function extractEbayItemId(url) {
  const match = url.match(/\/itm\/(\d+)/);
  return match ? match[1] : null;
}

function extractAmazonASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})/);
  return match ? match[1] : null;
}

function extractBestBuySKU(url) {
  const match = url.match(/skuId=(\d+)/);
  return match ? match[1] : null;
}

function extractNeweggItem(url) {
  const match = url.match(/Item=([A-Z0-9]+)/);
  return match ? match[1] : null;
}

module.exports = {
  extractProductInfo,
  scrapeEbay,
  scrapeAmazon,
  scrapeBestBuy,
  scrapeWalmart,
  scrapeTarget,
  scrapeNewegg
};