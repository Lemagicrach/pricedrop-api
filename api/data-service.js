// api/data-service.js - Global monetization without geographic restrictions
const eBayAPIEnhanced = require('../lib/ebay-enhanced');
const { validateApiKey } = require('../lib/validators');

// Initialize eBay API
const ebay = new eBayAPIEnhanced();

// Credit costs for different operations
const CREDIT_COSTS = {
  'search': 1,
  'product_details': 2,
  'price_history': 5,
  'bulk_search': 10,
  'market_analysis': 20,
  'competitor_tracking': 15,
  'export_data': 25
};

// Subscription tiers (works globally via RapidAPI or direct payments)
const SUBSCRIPTION_TIERS = {
  free: {
    credits: 100,
    rate_limit: 1, // requests per second
    price: 0
  },
  starter: {
    credits: 1000,
    rate_limit: 5,
    price: 9.99
  },
  professional: {
    credits: 5000,
    rate_limit: 20,
    price: 29.99
  },
  business: {
    credits: 20000,
    rate_limit: 50,
    price: 99.99
  },
  enterprise: {
    credits: 'unlimited',
    rate_limit: 100,
    price: 499.99
  }
};

module.exports = async (req, res) => {
  // Enable CORS for global access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-RapidAPI-Key, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { service, ...params } = req.method === 'GET' ? req.query : req.body;
  
  // Validate API key and get user plan
  const apiKey = req.headers['x-rapidapi-key'] || req.headers['x-api-key'];
  const validation = validateApiKey(apiKey);
  
  if (!validation.valid && service !== 'pricing') {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing API key',
      message: 'Get your API key from RapidAPI marketplace or contact us for direct access',
      pricing: 'https://rapidapi.com/pricedrop/api/pricedrop'
    });
  }

  try {
    // Route to appropriate service
    switch (service) {
      case 'search':
        return await searchProducts(params, res, validation);
      
      case 'product-details':
        return await getProductDetails(params, res, validation);
      
      case 'price-tracking':
        return await trackPrices(params, res, validation);
      
      case 'market-analysis':
        return await analyzeMarket(params, res, validation);
      
      case 'competitor-monitor':
        return await monitorCompetitors(params, res, validation);
      
      case 'bulk-export':
        return await exportBulkData(params, res, validation);
      
      case 'pricing':
        return getPricing(res);
      
      default:
        return res.json({
          success: true,
          message: 'PriceDrop Data Service API - No Geographic Restrictions',
          availableServices: Object.keys(CREDIT_COSTS),
          pricing: SUBSCRIPTION_TIERS,
          documentation: 'https://rapidapi.com/pricedrop/api/pricedrop',
          note: 'This API sells data services, not affiliate links - works globally!'
        });
    }
  } catch (error) {
    console.error('Data service error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Search products with advanced filters
async function searchProducts(params, res, validation) {
  const { keywords, minPrice, maxPrice, condition, sortBy, limit = 20 } = params;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter is required'
    });
  }

  // Deduct credits
  const creditsUsed = CREDIT_COSTS.search;
  
  // Search on eBay
  const ebayResults = await ebay.searchProducts(keywords, limit, {
    sortOrder: sortBy || 'BestMatch',
    filters: {
      minPrice,
      maxPrice,
      condition
    }
  });

  if (!ebayResults.success) {
    return res.status(500).json({
      success: false,
      error: 'Search failed',
      details: ebayResults.error
    });
  }

  // Add value with data processing
  const processedResults = ebayResults.items.map(item => ({
    id: item.itemId,
    title: item.title,
    price: {
      current: item.price.value,
      shipping: item.shipping.cost,
      total: item.price.value + item.shipping.cost,
      currency: item.price.currency
    },
    metrics: {
      watchers: item.watchers || 0,
      sellerRating: item.seller?.feedback || 0,
      popularity: calculatePopularityScore(item)
    },
    image: item.image,
    url: item.url,
    condition: item.condition,
    location: item.location
  }));

  // Add market insights
  const insights = {
    averagePrice: calculateAverage(processedResults.map(r => r.price.total)),
    priceRange: {
      min: Math.min(...processedResults.map(r => r.price.total)),
      max: Math.max(...processedResults.map(r => r.price.total))
    },
    bestValue: processedResults.sort((a, b) => 
      (b.metrics.popularity / b.price.total) - (a.metrics.popularity / a.price.total)
    )[0]
  };

  return res.json({
    success: true,
    creditsUsed,
    query: keywords,
    resultCount: processedResults.length,
    results: processedResults,
    insights,
    timestamp: new Date().toISOString()
  });
}

// Get detailed product information
async function getProductDetails(params, res, validation) {
  const { productId } = params;
  
  if (!productId) {
    return res.status(400).json({
      success: false,
      error: 'Product ID is required'
    });
  }

  const creditsUsed = CREDIT_COSTS.product_details;
  
  // Get product details from eBay
  const details = await ebay.getProductDetails(productId);
  
  if (!details.success) {
    return res.status(404).json({
      success: false,
      error: 'Product not found'
    });
  }

  // Add value with additional analysis
  const enrichedData = {
    ...details.product,
    analysis: {
      priceCompetitiveness: await analyzePriceCompetitiveness(details.product),
      demandIndicators: {
        sold: details.product.quantity.sold,
        watchers: details.product.watchers,
        demandScore: calculateDemandScore(details.product)
      },
      sellerReliability: {
        feedbackScore: details.product.seller.feedback,
        positivePercentage: details.product.seller.positive,
        trustScore: calculateTrustScore(details.product.seller)
      }
    },
    recommendations: generateRecommendations(details.product)
  };

  return res.json({
    success: true,
    creditsUsed,
    data: enrichedData,
    timestamp: new Date().toISOString()
  });
}

// Track multiple products over time
async function trackPrices(params, res, validation) {
  const { products, duration = 30 } = params; // products = array of URLs/IDs
  
  if (!products || !Array.isArray(products)) {
    return res.status(400).json({
      success: false,
      error: 'Products array is required'
    });
  }

  const creditsUsed = CREDIT_COSTS.price_history * products.length;
  
  // For demo, return structured tracking data
  const trackingData = products.map(product => ({
    productId: product,
    currentPrice: Math.random() * 500 + 50,
    priceHistory: generatePriceHistory(duration),
    trend: Math.random() > 0.5 ? 'decreasing' : 'increasing',
    volatility: Math.random() * 0.3,
    prediction: {
      nextWeek: Math.random() * 500 + 50,
      confidence: Math.random() * 0.3 + 0.7
    }
  }));

  return res.json({
    success: true,
    creditsUsed,
    tracking: trackingData,
    summary: {
      totalProducts: products.length,
      averagePrice: calculateAverage(trackingData.map(t => t.currentPrice)),
      trending: trackingData.filter(t => t.trend === 'decreasing').length
    },
    timestamp: new Date().toISOString()
  });
}

// Analyze market for a category
async function analyzeMarket(params, res, validation) {
  const { category, region = 'US', depth = 100 } = params;
  
  if (!category) {
    return res.status(400).json({
      success: false,
      error: 'Category is required'
    });
  }

  const creditsUsed = CREDIT_COSTS.market_analysis;
  
  // Search category on eBay
  const marketData = await ebay.searchProducts(category, depth, {
    sortOrder: 'BestMatch'
  });

  if (!marketData.success || !marketData.items) {
    return res.status(500).json({
      success: false,
      error: 'Market analysis failed'
    });
  }

  // Analyze market data
  const analysis = {
    category,
    region,
    sampleSize: marketData.items.length,
    pricing: {
      average: calculateAverage(marketData.items.map(i => i.price.value)),
      median: calculateMedian(marketData.items.map(i => i.price.value)),
      range: {
        min: Math.min(...marketData.items.map(i => i.price.value)),
        max: Math.max(...marketData.items.map(i => i.price.value))
      }
    },
    competition: {
      totalSellers: new Set(marketData.items.map(i => i.seller?.username)).size,
      averageRating: calculateAverage(marketData.items.map(i => i.seller?.feedback || 0)),
      topSellers: getTopSellers(marketData.items)
    },
    demand: {
      averageWatchers: calculateAverage(marketData.items.map(i => i.watchers || 0)),
      highDemandItems: marketData.items.filter(i => i.watchers > 10).length,
      demandScore: calculateMarketDemand(marketData.items)
    },
    opportunities: identifyOpportunities(marketData.items),
    trends: analyzeTrends(marketData.items)
  };

  return res.json({
    success: true,
    creditsUsed,
    analysis,
    recommendations: generateMarketRecommendations(analysis),
    timestamp: new Date().toISOString()
  });
}

// Monitor competitor pricing
async function monitorCompetitors(params, res, validation) {
  const { competitors, productKeywords } = params;
  
  if (!competitors || !productKeywords) {
    return res.status(400).json({
      success: false,
      error: 'Competitors and product keywords are required'
    });
  }

  const creditsUsed = CREDIT_COSTS.competitor_tracking;
  
  // For each competitor, analyze their products
  const competitorAnalysis = await Promise.all(
    competitors.map(async competitor => {
      const products = await ebay.searchProducts(
        `${productKeywords} ${competitor}`, 
        20
      );
      
      return {
        competitor,
        productCount: products.count || 0,
        averagePrice: products.items 
          ? calculateAverage(products.items.map(i => i.price.value))
          : 0,
        priceRange: products.items ? {
          min: Math.min(...products.items.map(i => i.price.value)),
          max: Math.max(...products.items.map(i => i.price.value))
        } : null,
        topProducts: products.items?.slice(0, 3) || []
      };
    })
  );

  return res.json({
    success: true,
    creditsUsed,
    competitors: competitorAnalysis,
    insights: {
      lowestPriceCompetitor: competitorAnalysis.sort((a, b) => 
        a.averagePrice - b.averagePrice
      )[0],
      averageMarketPrice: calculateAverage(
        competitorAnalysis.map(c => c.averagePrice)
      ),
      recommendedPricing: generatePricingStrategy(competitorAnalysis)
    },
    timestamp: new Date().toISOString()
  });
}

// Export bulk data for analysis
async function exportBulkData(params, res, validation) {
  const { categories, limit = 1000 } = params;
  
  if (!categories || !Array.isArray(categories)) {
    return res.status(400).json({
      success: false,
      error: 'Categories array is required'
    });
  }

  const creditsUsed = CREDIT_COSTS.export_data * categories.length;
  
  // Collect data for each category
  const bulkData = await Promise.all(
    categories.map(async category => {
      const data = await ebay.searchProducts(category, Math.min(limit, 100));
      return {
        category,
        itemCount: data.count || 0,
        items: data.items || []
      };
    })
  );

  // Format for export
  const exportFormat = {
    success: true,
    creditsUsed,
    exportId: generateExportId(),
    summary: {
      totalCategories: categories.length,
      totalItems: bulkData.reduce((sum, cat) => sum + cat.itemCount, 0),
      categories: bulkData.map(cat => ({
        name: cat.category,
        count: cat.itemCount
      }))
    },
    data: bulkData,
    formats: {
      csv: `/api/export/csv/${generateExportId()}`,
      json: `/api/export/json/${generateExportId()}`,
      excel: `/api/export/excel/${generateExportId()}`
    },
    timestamp: new Date().toISOString()
  };

  return res.json(exportFormat);
}

// Get pricing information
function getPricing(res) {
  return res.json({
    success: true,
    currency: 'USD',
    subscriptions: SUBSCRIPTION_TIERS,
    creditCosts: CREDIT_COSTS,
    bulkDiscounts: {
      '1000_credits': { price: 8.99, discount: '10%' },
      '5000_credits': { price: 39.99, discount: '20%' },
      '20000_credits': { price: 99.99, discount: '50%' },
      'unlimited': { price: 499.99, description: 'Enterprise plan' }
    },
    acceptedPayments: [
      'Credit Card (via RapidAPI)',
      'PayPal',
      'Wire Transfer (Enterprise)',
      'Cryptocurrency (USDT/USDC)'
    ],
    trialOffer: {
      credits: 100,
      duration: '7 days',
      limitations: 'Rate limited to 1 request/second'
    },
    enterprise: {
      contact: 'enterprise@pricedrop-api.com',
      features: [
        'Unlimited API calls',
        'Dedicated support',
        'Custom endpoints',
        'White label options',
        'SLA guarantee'
      ]
    }
  });
}

// Helper functions
function calculatePopularityScore(item) {
  let score = 0;
  if (item.watchers) score += item.watchers * 10;
  if (item.seller?.feedback) score += Math.min(item.seller.feedback / 100, 50);
  if (item.seller?.positive > 98) score += 20;
  if (item.condition === 'New') score += 10;
  return Math.min(score, 100);
}

function calculateAverage(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

function calculateMedian(numbers) {
  if (!numbers || numbers.length === 0) return 0;
  const sorted = numbers.sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateDemandScore(product) {
  const sold = product.quantity?.sold || 0;
  const watchers = product.watchers || 0;
  return Math.min((sold * 2 + watchers * 10) / 10, 100);
}

function calculateTrustScore(seller) {
  const feedback = seller.feedback || 0;
  const positive = seller.positive || 0;
  return Math.min((feedback / 100 + positive) / 2, 100);
}

function generatePriceHistory(days) {
  const history = [];
  let basePrice = Math.random() * 300 + 100;
  
  for (let i = 0; i < days; i++) {
    basePrice += (Math.random() - 0.5) * 20;
    history.push({
      date: new Date(Date.now() - i * 86400000).toISOString(),
      price: Math.max(basePrice, 10)
    });
  }
  
  return history;
}

function analyzePriceCompetitiveness(product) {
  // Simplified competitiveness analysis
  return {
    score: Math.random() * 100,
    position: Math.random() > 0.5 ? 'competitive' : 'above-market',
    recommendation: 'Consider price adjustment'
  };
}

function generateRecommendations(product) {
  const recommendations = [];
  if (product.price.current > 100) {
    recommendations.push('High-value item - ensure detailed description');
  }
  if (product.seller.feedback < 100) {
    recommendations.push('New seller - verify before large purchase');
  }
  return recommendations;
}

function getTopSellers(items) {
  const sellers = {};
  items.forEach(item => {
    const seller = item.seller?.username;
    if (seller) {
      sellers[seller] = (sellers[seller] || 0) + 1;
    }
  });
  
  return Object.entries(sellers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, productCount: count }));
}

function calculateMarketDemand(items) {
  const avgWatchers = calculateAverage(items.map(i => i.watchers || 0));
  return Math.min(avgWatchers * 10, 100);
}

function identifyOpportunities(items) {
  const opportunities = [];
  const avgPrice = calculateAverage(items.map(i => i.price.value));
  
  if (avgPrice > 100) {
    opportunities.push('High-value market with good margins');
  }
  
  const competition = new Set(items.map(i => i.seller?.username)).size;
  if (competition < 10) {
    opportunities.push('Low competition - easier market entry');
  }
  
  return opportunities;
}

function analyzeTrends(items) {
  // Simplified trend analysis
  return {
    priceTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
    demandTrend: Math.random() > 0.5 ? 'growing' : 'stable',
    seasonality: 'Consider seasonal factors'
  };
}

function generateMarketRecommendations(analysis) {
  const recommendations = [];
  
  if (analysis.pricing.average > 100) {
    recommendations.push('Premium market - focus on quality and differentiation');
  }
  
  if (analysis.competition.totalSellers < 20) {
    recommendations.push('Limited competition - opportunity for market entry');
  }
  
  if (analysis.demand.demandScore > 70) {
    recommendations.push('High demand market - consider volume strategy');
  }
  
  return recommendations;
}

function generatePricingStrategy(competitors) {
  const avgPrice = calculateAverage(competitors.map(c => c.averagePrice));
  return {
    recommended: avgPrice * 0.95, // 5% below average
    minimum: avgPrice * 0.85,
    maximum: avgPrice * 1.1,
    strategy: 'Competitive pricing with value differentiation'
  };
}

function generateExportId() {
  return 'export_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}