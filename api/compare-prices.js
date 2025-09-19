module.exports = async (req, res) => {
  const { product } = req.body;
  
  // Search eBay
  const ebayResults = await ebay.searchProducts(product, 5);
  
  // Format for comparison
  const prices = {
    ebay: {
      lowest: ebayResults.items[0]?.price,
      average: calculateAverage(ebayResults.items),
      link: ebayResults.items[0]?.url
    },
    amazon: {
      note: "Amazon requires PA-API access",
      affiliateLink: `https://amazon.com/s?k=${product}&tag=your-tag`
    }
  };
  
  res.json(prices);
};