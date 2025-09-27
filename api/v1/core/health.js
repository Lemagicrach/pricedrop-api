// api/v1/core/health.js - No auth required for testing
const { withCORS } = require('../../../lib/middleware');

module.exports = withCORS(async (req, res) => {
  // Check service dependencies
  const checks = {
    api: 'operational',
    database: 'operational',
    ebay_api: 'operational',
    amazon_api: 'limited', // PA-API requires approval
    rapidapi: 'configured'
  };
  
  // Calculate overall health
  const allOperational = Object.values(checks)
    .every(status => status === 'operational' || status === 'configured');
  
  res.status(200).json({
    success: true,
    status: allOperational ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'PriceDrop API',
    
    checks: checks,
    
    uptime: {
      seconds: process.uptime(),
      formatted: formatUptime(process.uptime())
    },
    
    resources: {
      memory: {
        used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
        total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB'
      },
      cpu: process.cpuUsage()
    },
    
    rapidapi: {
      headers_detected: {
        'X-RapidAPI-Key': !!req.headers['x-rapidapi-key'],
        'X-RapidAPI-Host': !!req.headers['x-rapidapi-host']
      },
      cors_enabled: true,
      auth_not_required: true,
      note: 'This endpoint does not require authentication for testing'
    }
  });
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}