// api/search-all.js
module.exports = async (req, res) => {
  const { keywords } = req.query;
  
  // Get eBay results
  const ebayResults = await ebay.searchProducts(keywords, 5);
  
  // Create Amazon search link
  const amazonLink = `https://amazon.com/s?k=${keywords}&tag=${process.env.AMAZON_TAG}`;
  
  res.json({
    ebay: ebayResults.items,
    amazon: {
      searchLink: amazonLink,
      note: "Direct API access requires PA-API approval"
    }
  });
};