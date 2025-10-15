// api/v1/core/health.js - Health Check
// Route: GET /api/v1/core/health
// Auth: Public (no authentication required)

const { publicRoute } = require('../../../lib/middleware');
const { success } = require('../../../lib/utils/response');

module.exports = publicRoute(async (req, res) => {
  // Check service dependencies
  const checks = {
    api: 'operational',
    database: await checkDatabase(),
    ebay_api: await checkEbayAPI(),
    amazon_api: 'limited', // PA-API requires approval
    rapidapi: 'configured'
  };

  // Calculate overall health
  const allOperational = Object.values(checks).every(
    status => status === 'operational' || status === 'configured' || status === 'limited'
  );

  return success(res, {
    status: allOperational ? 'healthy' : 'degraded',
    version: '1.0.0',
    service: 'PriceDrop API',
    checks,
    uptime: {
      seconds: process.uptime(),
      formatted: formatUptime(process.uptime())
    },
    resources: {
      memory: {
        used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
        total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
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
      note: 'This endpoint does not require authentication'
    }
  });
});

// Helper functions
async function checkDatabase() {
  try {
    const { supabase } = require('../../../services/database');
    if (!supabase) return 'not_configured';
    
    const { error } = await supabase.from('products').select('count').limit(1);
    return error ? 'error' : 'operational';
  } catch {
    return 'not_configured';
  }
}

async function checkEbayAPI() {
  try {
    const eBayAPI = require('../../../lib/ebay');
    const ebay = new eBayAPI();
    return ebay.isConfigured() ? 'operational' : 'not_configured';
  } catch {
    return 'error';
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}