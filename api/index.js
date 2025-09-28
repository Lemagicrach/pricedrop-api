// api/v1/index.js - Main API documentation
const { withCORS } = require('../../lib/middleware');

module.exports = withCORS(async (req, res) => {
  const host = req.headers.host || 'your-api.vercel.app';
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const baseUrl = `${protocol}://${host}`;
  
  res.status(200).json({
    success: true,
    message: '🎉 PriceDrop API v1.0 - Ready for RapidAPI!',
    version: '1.0.0',
    status: 'operational',
    timestamp: new Date().toISOString(),
    
    rapidapi: {
      configured: true,
      headers_required: ['X-RapidAPI-Key', 'X-RapidAPI-Host'],
      test_endpoint: `${baseUrl}/api/v1/core/health`
    },
    
    endpoints: {
      // Core endpoints
      health: {
        path: '/api/v1/core/health',
        method: 'GET',
        description: 'Health check endpoint',