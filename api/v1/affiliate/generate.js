// api/v1/affiliate/generate.js
const { withRapidAPI } = require('../../../lib/middleware');

module.exports = withRapidAPI(async (req, res) => {
  const { urls, platform } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({
      success: false,
      error: 'URLs array required'
    });
  }
  
  const affiliateLinks = urls.map(url => {
    if (url.includes('amazon')) {
      const asin = url.match(/\/([A-Z0-9]{10})/)?.[1];
      return {
        original: url,
        affiliate: `https://amazon.com/dp/${asin}?tag=${process.env.AMAZON_TAG}`,
        platform: 'amazon'
      };
    }
    // Add more platforms
    return { original: url, error: 'Unsupported platform' };
  });
  
  res.json({
    success: true,
    links: affiliateLinks,
    timestamp: new Date().toISOString()
  });
});