// In /api/price-check.js, replace everything with:
module.exports = async (req, res) => {
  const { url } = req.body;
  
  res.json({
    success: true,
    message: "API received your URL",
    url: url,
    note: "Advanced features coming soon",
    timestamp: new Date().toISOString()
  });
};