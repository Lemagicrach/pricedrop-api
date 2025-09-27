// api/v1/prices/history.js - Price history endpoint
const { withRapidAPI } = require('../../../lib/middleware');

// Mock price history data (replace with database)
const generateMockHistory = (days = 30) => {
  const history = [];
  let basePrice = 200 + Math.random() * 100;
  
  for (let i = days; i >= 0; i--) {
    // Add some price variation
    basePrice += (Math.random() - 0.5) * 20;
    basePrice = Math.max(basePrice, 50); // Minimum price
    
    history.push({
      price: parseFloat(basePrice.toFixed(2)),
      timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      available: true
    });
  }
  
  return history;
};

module.exports = withRapidAPI(async (req, res) => {
  const { 
    product_id,     // Product ID or URL
    tracking_id,    // Tracking ID from track endpoint
    days = 30,      // Number of days of history
    interval = 'daily' // daily, hourly, weekly
  } = req.query;
  
  if (!product_id && !tracking_id) {
    return res.status(400).json({
      success: false,
      error: 'Product ID or Tracking ID required',
      code: 'MISSING_IDENTIFIER'
    });
  }
  
  try {
    // Generate mock history data
    const priceHistory = generateMockHistory(parseInt(days));
    
    // Calculate statistics
    const prices = priceHistory.map(h => h.price);
    const currentPrice = prices[prices.length - 1];
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    
    // Calculate trend
    const recentPrices = prices.slice(-7); // Last 7 days
    const recentAverage = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderPrices = prices.slice(-14, -7); // Previous 7 days
    const olderAverage = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
    const trend = recentAverage > olderAverage ? 'increasing' : 
                 recentAverage < olderAverage ? 'decreasing' : 'stable';
    
    // Price drop alerts
    const priceDrops = [];
    for (let i = 1; i < priceHistory.length; i++) {
      const drop = priceHistory[i - 1].price - priceHistory[i].price;
      if (drop > 0) {
        const dropPercent = (drop / priceHistory[i - 1].price) * 100;
        if (dropPercent >= 5) { // Significant drop (5% or more)
          priceDrops.push({
            date: priceHistory[i].timestamp,
            from: priceHistory[i - 1].price,
            to: priceHistory[i].price,
            drop: drop.toFixed(2),
            percent: dropPercent.toFixed(1)
          });
        }
      }
    }
    
    res.json({
      success: true,
      query: {
        product_id,
        tracking_id,
        days: parseInt(days),
        interval
      },
      statistics: {
        current_price: currentPrice,
        lowest_price: lowestPrice,
        highest_price: highestPrice,
        average_price: averagePrice.toFixed(2),
        price_range: (highestPrice - lowestPrice).toFixed(2),
        trend: trend,
        volatility: ((highestPrice - lowestPrice) / averagePrice * 100).toFixed(1) + '%'
      },
      significant_drops: priceDrops,
      history: priceHistory,
      chart_data: {
        labels: priceHistory.map(h => new Date(h.timestamp).toLocaleDateString()),
        values: priceHistory.map(h => h.price)
      },
      recommendations: {
        buy_now: currentPrice <= lowestPrice * 1.05, // Within 5% of lowest
        wait: trend === 'decreasing',
        target_price: (lowestPrice * 1.1).toFixed(2) // 10% above lowest
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('History error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve price history',
      message: error.message
    });
  }
});