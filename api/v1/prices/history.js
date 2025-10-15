// api/v1/prices/history.js - Get Price History
// Route: GET /api/v1/prices/history?product_id={id}&days={number}
// Auth: Required

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { validateRequired, validateNumber, validateEnum } = require('../../../lib/utils/validation');
const { getPriceHistory } = require('../../../services/database');

module.exports = protectedRoute(async (req, res) => {
  // Validate inputs
  const productId = validateRequired(req.query.product_id, 'product_id');
  const days = validateNumber(req.query.days || 30, 'days', { 
    min: 1, 
    max: 365, 
    integer: true 
  });
  const interval = req.query.interval 
    ? validateEnum(req.query.interval, 'interval', ['daily', 'hourly', 'weekly'])
    : 'daily';

  // Get price history from database
  const historyData = await getPriceHistory(productId, days);

  if (!historyData || !historyData.history || historyData.history.length === 0) {
    // Return mock data if no history exists
    return success(res, {
      query: { product_id: productId, days, interval },
      message: 'No price history available for this product yet',
      statistics: null,
      history: [],
      chart_data: { labels: [], values: [] },
      recommendations: {
        message: 'Start tracking this product to build price history'
      }
    });
  }

  // Calculate statistics
  const prices = historyData.history.map(h => h.price);
  const currentPrice = prices[prices.length - 1];
  const lowestPrice = Math.min(...prices);
  const highestPrice = Math.max(...prices);
  const averagePrice = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);

  // Calculate trend
  const recentPrices = prices.slice(-7);
  const olderPrices = prices.slice(-14, -7);
  const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
  const olderAvg = olderPrices.length > 0 
    ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
    : recentAvg;
  
  const trend = recentAvg > olderAvg ? 'increasing' : 
                recentAvg < olderAvg ? 'decreasing' : 'stable';

  // Find significant price drops
  const priceDrops = [];
  for (let i = 1; i < historyData.history.length; i++) {
    const drop = historyData.history[i - 1].price - historyData.history[i].price;
    if (drop > 0) {
      const dropPercent = (drop / historyData.history[i - 1].price) * 100;
      if (dropPercent >= 5) {
        priceDrops.push({
          date: historyData.history[i].recorded_at || historyData.history[i].timestamp,
          from: historyData.history[i - 1].price,
          to: historyData.history[i].price,
          drop: drop.toFixed(2),
          percent: `${dropPercent.toFixed(1)}%`
        });
      }
    }
  }

  return success(res, {
    query: { product_id: productId, days, interval },
    statistics: {
      current_price: currentPrice,
      lowest_price: lowestPrice,
      highest_price: highestPrice,
      average_price: averagePrice,
      price_range: (highestPrice - lowestPrice).toFixed(2),
      trend,
      volatility: `${((highestPrice - lowestPrice) / parseFloat(averagePrice) * 100).toFixed(1)}%`
    },
    significant_drops: priceDrops,
    history: historyData.history,
    chart_data: {
      labels: historyData.history.map(h => 
        new Date(h.recorded_at || h.timestamp).toLocaleDateString()
      ),
      values: historyData.history.map(h => h.price)
    },
    recommendations: {
      buy_now: currentPrice <= lowestPrice * 1.05,
      wait: trend === 'decreasing',
      target_price: (lowestPrice * 1.1).toFixed(2),
      reasoning: currentPrice <= lowestPrice * 1.05
        ? 'Price is within 5% of historical low - good time to buy'
        : trend === 'decreasing'
        ? 'Price trending down - consider waiting'
        : 'Monitor for price drops'
    }
  });
});