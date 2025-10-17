// api/v1/core/health.js - Health Check Endpoint
const os = require('os');
const { testConnection } = require('../../../lib/services/database');

/**
 * Get system health status
 * @returns {Promise<Object>} Health status object
 */
async function getHealthStatus() {
  const startTime = process.hrtime();
  
  // Check database connection
  const dbHealthy = await testConnection();
  
  // Calculate response time
  const [seconds, nanoseconds] = process.hrtime(startTime);
  const responseTime = seconds * 1000 + nanoseconds / 1000000;
  
  // Determine overall status
  const status = dbHealthy ? 'healthy' : 'degraded';
  
  return {
    success: true,
    status,
    service: 'PriceDrop API',
    version: process.env.API_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: {
      seconds: process.uptime(),
      formatted: formatUptime(process.uptime())
    },
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        status: dbHealthy ? 'healthy' : 'unhealthy',
        responseTime: `${responseTime.toFixed(2)}ms`
      }
    },
    system: {
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        percentage: ((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100).toFixed(2)
      },
      cpu: {
        loadAverage: os.loadavg(),
        cores: os.cpus().length
      }
    }
  };
}

/**
 * Format uptime in human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} Formatted uptime
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Health check endpoint handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
async function healthHandler(req, res) {
  try {
    const healthStatus = await getHealthStatus();
    
    // Set the response body for testing
    res.body = healthStatus;
    
    // Send the response
    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    const errorResponse = {
      success: false,
      status: 'unhealthy',
      service: 'PriceDrop API',
      error: error.message,
      timestamp: new Date().toISOString()
    };
    
    res.body = errorResponse;
    res.status(503).json(errorResponse);
  }
}

module.exports = healthHandler;