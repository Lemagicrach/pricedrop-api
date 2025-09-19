// api/docs.js
module.exports = (req, res) => {
  res.json({
    documentation: "PriceDrop API v1.0",
    baseUrl: "https://pricedrop-api-five.vercel.app",
    endpoints: [
      {
        path: "/api/ebay-search",
        method: "GET",
        params: "?keywords=phone&limit=10",
        description: "Search eBay products"
      },
      // ... more endpoints
    ]
  });
};