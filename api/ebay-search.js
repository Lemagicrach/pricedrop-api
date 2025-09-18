const eBayAPI = require('../lib/ebay');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  const { keywords, limit = 10 } = req.method === 'GET' ? req.query : req.body;
  
  if (!keywords) {
    return res.status(400).json({
      success: false,
      error: 'Keywords parameter required'
    });
  }
  
  // Use sandbox for now, switch to production when approved
  const ebay = new eBayAPI(
    process.env.EBAY_SANDBOX_APP_ID,
    'sandbox'
  );
  
  const results = await ebay.searchProducts(keywords, limit);
  
  res.json({
    ...results,
    environment: 'sandbox',
    note: 'Using sandbox data until production keys approved'
  });
};