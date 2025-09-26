// api/monetize.js - Complete monetization endpoint
const eBayAPIEnhanced = require('../lib/ebay-enhanced');
const AmazonAffiliateAPI = require('../lib/amazon-enhanced');
const { validateApiKey } = require('../lib/validators');

// Initialize APIs
const ebay = new eBayAPIEnhanced();
const amazon = new AmazonAffiliateAPI();

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action, ...params } = req.method === 'GET' ? req.query : req.body;
  
  // Validate API key for premium features
  const apiKey = req.headers['x-rapidapi-key'] || req.headers['x-api-key'];
  const validation = validateApiKey(apiKey);
  
  if (!validation.valid) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      message: 'Get your API key from RapidAPI marketplace'
    });
  }

  try {
    switch (action) {
      // =============== PRICE COMPARISON ===============
      case 'compare-prices':
        return await comparePrices(params, res);
      
      // =============== AFFILIATE LINKS ===============
      case 'generate-affiliate-links':
        return await generateAffiliateLinks(params, res);
      
      // =============== PRODUCT SEARCH ===============
      case 'search-all-platforms':
        return await searchAllPlatforms(params, res);
      
      // =============== DEAL FINDER ===============
      case 'find-best-deals':
        return await findBestDeals(params, res);
      
      // =============== MONETIZATION STATS ===============
      case 'get-earnings':
        return await getEarnings(params, res);
      
      default:
        return res.json({
          success: true,
          message: 'PriceDrop Monetization API',
          availableActions: [
            'compare-prices',
            'generate-affiliate-links',
            'search-all-platforms',
            'find-best-deals',
            'get-earnings'
          ],
          documentation: 'https://rapidapi.com/pricedrop-api/api/pricedrop'
        });
    }
  } catch (error) {
    console.error('Monetization error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Compare prices across platforms
async function comparePrices(params, res) {
  const { keywords, category } = params;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter is required'
    });
  }

  // Search eBay
  const ebayResults = await ebay.searchProducts(keywords, 10, {
    sortOrder: 'PricePlusShippingLowest'
  });

  // Generate Amazon search link (can't get real prices without PA-API)
  const amazonLinks = amazon.generateSearchLink(keywords);
  
  // Combine results with affiliate links
  const comparison = {
    success: true,
    query: keywords,
    category: category || 'all',
    results: {
      ebay: {
        available: ebayResults.success,
        count: ebayResults.count || 0,
        items: ebayResults.success ? ebayResults.items.slice(0, 5).map(item => ({
          title: item.title,
          price: item.price.value,
          shipping: item.shipping.cost,
          totalPrice: item.price.value + item.shipping.cost,
          currency: item.price.currency,
          url: item.url,
          affiliateUrl: ebay.generateAffiliateLink(item.url),
          image: item.image,
          condition: item.condition
        })) : []
      },
      amazon: {
        available: true,
        searchUrl: amazonLinks,
        affiliateSearchUrl: amazonLinks,
        note: 'Click to see current Amazon prices',
        message: 'Real-time Amazon prices require PA-API access'
      }
    },
    lowestPrice: findLowestPrice(ebayResults.items),
    timestamp: new Date().toISOString()
  };

  return res.json(comparison);
}

// Generate affiliate links for multiple products
async function generateAffiliateLinks(params, res) {
  const { urls } = params;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({
      success: false,
      error: 'URLs array is required'
    });
  }

  const results = {
    success: true,
    links: [],
    earnings: {
      potential: 0,
      currency: 'USD',
      note: 'Based on average commission rates'
    }
  };

  for (const url of urls) {
    if (url.includes('amazon')) {
      const amazonResult = amazon.createAffiliateLink(url);
      if (amazonResult.success) {
        results.links.push({
          platform: 'amazon',
          original: url,
          affiliate: amazonResult.affiliateUrl,
          shortLink: amazonResult.shortLink,
          asin: amazonResult.asin,
          commission: '1-10% depending on category'
        });
        results.earnings.potential += 5; // Average 5% commission
      }
    } else if (url.includes('ebay')) {
      const affiliateUrl = ebay.generateAffiliateLink(url);
      results.links.push({
        platform: 'ebay',
        original: url,
        affiliate: affiliateUrl,
        commission: '50-70% of eBay revenue'
      });
      results.earnings.potential += 3; // Average commission
    } else {
      results.links.push({
        platform: 'unknown',
        original: url,
        error: 'Unsupported platform',
        supportedPlatforms: ['amazon', 'ebay']
      });
    }
  }

  return res.json(results);
}

// Search all platforms simultaneously
async function searchAllPlatforms(params, res) {
  const { keywords, minPrice, maxPrice, condition } = params;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter is required'
    });
  }

  // Build eBay filters
  const ebayFilters = {};
  if (minPrice) {
    ebayFilters['itemFilter(2).name'] = 'MinPrice';
    ebayFilters['itemFilter(2).value'] = minPrice;
  }
  if (maxPrice) {
    ebayFilters['itemFilter(3).name'] = 'MaxPrice';
    ebayFilters['itemFilter(3).value'] = maxPrice;
  }
  if (condition === 'new') {
    ebayFilters['itemFilter(4).name'] = 'Condition';
    ebayFilters['itemFilter(4).value'] = 'New';
  }

  // Search eBay
  const ebayResults = await ebay.searchProducts(keywords, 20, {
    filters: ebayFilters
  });

  // Generate Amazon links
  const amazonSearchUrl = amazon.generateSearchLink(keywords);
  
  // Generate comparison widget for top products
  let comparisonWidget = null;
  if (ebayResults.success && ebayResults.items.length > 0) {
    // Try to find equivalent Amazon ASINs (would need actual matching in production)
    const sampleASINs = ['B08N5WRWNW', 'B07VGRJDFY', 'B08FC5L3RG']; // Example ASINs
    comparisonWidget = amazon.generateComparisonWidget(sampleASINs);
  }

  return res.json({
    success: true,
    query: {
      keywords,
      filters: { minPrice, maxPrice, condition }
    },
    results: {
      ebay: {
        success: ebayResults.success,
        count: ebayResults.count,
        items: ebayResults.items ? ebayResults.items.slice(0, 10) : []
      },
      amazon: {
        searchUrl: amazonSearchUrl,
        widget: comparisonWidget,
        note: 'Use search URL to view Amazon results'
      }
    },
    monetization: {
      ebayPartnerNetwork: 'Earn commissions on eBay sales',
      amazonAssociates: 'Earn 1-10% on Amazon sales',
      tip: 'Include affiliate links in your price comparison site'
    },
    timestamp: new Date().toISOString()
  });
}

// Find best deals across platforms
async function findBestDeals(params, res) {
  const { category = 'electronics', minDiscount = 20 } = params;
  
  // Search for deals on eBay
  const ebayDeals = await ebay.searchProducts(category, 50, {
    sortOrder: 'PricePlusShippingLowest'
  });

  const deals = [];
  
  if (ebayDeals.success) {
    // Filter for good deals (simplified - would need original price comparison)
    const goodDeals = ebayDeals.items.filter(item => {
      // Look for items with watchers (indicates interest)
      return item.watchers > 5 || item.condition === 'New';
    }).slice(0, 10);

    goodDeals.forEach(item => {
      deals.push({
        platform: 'ebay',
        title: item.title,
        currentPrice: item.price.value,
        shipping: item.shipping.cost,
        totalPrice: item.price.value + item.shipping.cost,
        condition: item.condition,
        url: item.url,
        affiliateUrl: ebay.generateAffiliateLink(item.url),
        image: item.image,
        seller: item.seller,
        watchers: item.watchers,
        score: calculateDealScore(item)
      });
    });
  }

  // Add Amazon category deals
  const amazonCategoryUrl = amazon.generateCategoryLink(category);
  
  // Sort by deal score
  deals.sort((a, b) => b.score - a.score);

  return res.json({
    success: true,
    category,
    dealsFound: deals.length,
    deals: deals,
    amazonDeals: {
      categoryUrl: amazonCategoryUrl,
      message: 'Visit Amazon for more deals in this category'
    },
    monetization: {
      estimatedEarnings: `$${(deals.length * 2.5).toFixed(2)}`,
      note: 'Based on average conversion rate of 5% and $50 average order value'
    },
    timestamp: new Date().toISOString()
  });
}

// Get earnings statistics (demo data)
async function getEarnings(params, res) {
  const { period = 'month' } = params;
  
  // In production, this would connect to actual affiliate dashboards
  const earnings = {
    success: true,
    period: period,
    platforms: {
      ebay: {
        clicks: 1250,
        conversions: 62,
        conversionRate: '4.96%',
        revenue: 3750.50,
        commission: 187.53,
        currency: 'USD'
      },
      amazon: {
        clicks: 2340,
        conversions: 117,
        conversionRate: '5.00%',
        revenue: 5850.00,
        commission: 234.00,
        currency: 'USD',
        note: 'Requires PA-API for accurate tracking'
      }
    },
    total: {
      clicks: 3590,
      conversions: 179,
      conversionRate: '4.99%',
      revenue: 9600.50,
      commission: 421.53,
      currency: 'USD'
    },
    projections: {
      monthly: 421.53,
      yearly: 5058.36
    },
    tips: [
      'Focus on high-converting product categories',
      'Use seasonal trends to maximize earnings',
      'Create comparison content to increase click-through rates',
      'Build email lists for repeat customers'
    ],
    resources: {
      ebayPartnerNetwork: 'https://partnernetwork.ebay.com',
      amazonAssociates: 'https://affiliate-program.amazon.com',
      tracking: 'Use UTM parameters for detailed tracking'
    }
  };

  return res.json(earnings);
}

// Helper function to calculate deal score
function calculateDealScore(item) {
  let score = 100;
  
  // Price factors
  if (item.price.value < 50) score += 20;
  if (item.shipping.cost === 0) score += 15;
  
  // Popularity factors
  if (item.watchers > 10) score += 25;
  if (item.seller?.feedback > 1000) score += 10;
  if (item.seller?.positive > 98) score += 10;
  
  // Condition factor
  if (item.condition === 'New') score += 20;
  
  return score;
}

// Find lowest price from items
function findLowestPrice(items) {
  if (!items || items.length === 0) return null;
  
  return items.reduce((lowest, item) => {
    const totalPrice = (item.price?.value || 0) + (item.shipping?.cost || 0);
    if (!lowest || totalPrice < lowest.price) {
      return {
        price: totalPrice,
        title: item.title,
        url: item.url
      };
    }
    return lowest;
  }, null);
}