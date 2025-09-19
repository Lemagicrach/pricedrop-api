module.exports = async (req, res) => {
  const { url, keywords } = req.body || req.query;
  
  if (url) {
    // Extract ASIN and create affiliate link
    const asin = url.match(/\/([A-Z0-9]{10})/)?.[1];
    return res.json({
      affiliateUrl: `https://amazon.com/dp/${asin}?tag=${process.env.AMAZON_TAG}`
    });
  }
  
  if (keywords) {
    // Search link with affiliate tag
    return res.json({
      searchUrl: `https://amazon.com/s?k=${encodeURIComponent(keywords)}&tag=${process.env.AMAZON_TAG}`
    });
  }
};