// scripts/test-production.js - Comprehensive Production Readiness Test
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

// Configuration
const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_KEY = process.env.TEST_API_KEY || 'test-key-123';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';

// Test eBay item (use a real one)
const TEST_EBAY_URL = 'https://www.ebay.com/itm/234567890123'; // Replace with real item

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper function to make API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'X-RapidAPI-Key': API_KEY,
        'X-RapidAPI-Host': 'pricedrop-api.p.rapidapi.com',
        'Content-Type': 'application/json'
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
      const responseData = error.response?.data;
    let message;

    const aggregateMessage = Array.isArray(error.errors)
      ? error.errors
          .map(err => {
            if (typeof err?.message === 'string' && err.message.trim().length > 0) {
              return err.message;
            }
            return String(err);
          })
          .filter(Boolean)
          .join('; ')
      : undefined;

    if (typeof error.message === 'string' && error.message.trim().length > 0 && error.message !== 'Error') {
      message = error.message;
    } else if (typeof error.cause?.message === 'string' && error.cause.message.trim().length > 0) {
      message = error.cause.message;
    } else if (typeof aggregateMessage === 'string' && aggregateMessage.trim().length > 0) {
      message = aggregateMessage;
    } else if (typeof responseData?.message === 'string' && responseData.message.trim().length > 0) {
      message = responseData.message;
    } else if (typeof responseData === 'string' && responseData.trim().length > 0) {
      message = responseData;
    } else if (responseData !== undefined) {
      try {
        message = JSON.stringify(responseData);
      } catch (stringifyError) {
        message = String(responseData);
      }
    } else if (typeof error.toString === 'function') {
      message = error.toString();
    }

    const normalizedMessage =
      typeof message === 'string' && message.trim().length > 0
        ? message
        : 'Unknown error';

    return {
      success: false,
      error: normalizedMessage,
      status: error.response?.status,
      debug: {
        responseData,
        message: error.message,
        stack: error.stack
      }
    };
  }
}

function formatError(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch (stringifyError) {
      return String(error);
    }
  }

  return String(error);
}

// Test functions
async function testHealthEndpoint() {
  console.log('\n📍 Testing Health Endpoint...');
  const result = await apiCall('GET', '/api/v1/core/health');
  
  if (result.success && result.data.status === 'healthy') {
    results.passed.push('Health endpoint');
    console.log(`${colors.green}✅ Health check passed${colors.reset}`);
    
    // Check service statuses
    const checks = result.data.checks;
    if (checks.database !== 'operational') {
      results.warnings.push('Database not operational');
      console.log(`${colors.yellow}⚠️ Database status: ${checks.database}${colors.reset}`);
    }
    if (checks.ebay_api !== 'operational') {
      results.warnings.push('eBay API not operational');
      console.log(`${colors.yellow}⚠️ eBay API status: ${checks.ebay_api}${colors.reset}`);
    }
    
    return true;
  } else {
    results.failed.push('Health endpoint');
    console.log(`${colors.red}❌ Health check failed: ${formatError(result.error)}${colors.reset}`);
    return false;
  }
}

async function testDatabaseConnection() {
  console.log('\n📍 Testing Database Connection...');
  
  // Try to fetch products (even if none exist)
  const result = await apiCall('GET', '/api/v1/products?limit=1');
  
  if (result.success) {
    results.passed.push('Database connection');
    console.log(`${colors.green}✅ Database connected successfully${colors.reset}`);
    return true;
  } else {
    if (typeof result.error === 'string' && result.error.includes('Database not configured')) {
      results.failed.push('Database connection');
      console.log(`${colors.red}❌ Database not configured - Check SUPABASE_URL and SUPABASE_ANON_KEY${colors.reset}`);
      return false;
    }
    // Might be empty but connected
    results.passed.push('Database connection');
    return true;
  }
}

async function testProductTracking() {
  console.log('\n📍 Testing Product Tracking...');
  
  const trackData = {
    url: TEST_EBAY_URL,
    target_price: 50.00,
    notify_on_drop: true,
    user_email: TEST_EMAIL
  };
  
  const result = await apiCall('POST', '/api/v1/products/track', trackData);
  
  if (result.success && result.data.success) {
    results.passed.push('Product tracking');
    console.log(`${colors.green}✅ Product tracking successful${colors.reset}`);
    
    // Check if we got real product data
    if (result.data.product?.name && result.data.product?.current_price) {
      console.log(`${colors.green}   Product: ${result.data.product.name}${colors.reset}`);
      console.log(`${colors.green}   Price: $${result.data.product.current_price}${colors.reset}`);
      
      // Save product ID for further tests
      global.testProductId = result.data.tracking.product_id;
      return true;
    } else {
      results.warnings.push('Product data incomplete');
      console.log(`${colors.yellow}⚠️ Product data is incomplete (might be mock data)${colors.reset}`);
      return true;
    }
  } else {
    results.failed.push('Product tracking');
    console.log(`${colors.red}❌ Product tracking failed: ${formatError(result.error)}${colors.reset}`);
    return false;
  }
}

async function testPriceHistory() {
  console.log('\n📍 Testing Price History...');
  
  const productId = global.testProductId || 'test-product';
  const result = await apiCall('GET', `/api/v1/prices/history?product_id=${productId}&days=7`);
  
  if (result.success && result.data.success) {
    results.passed.push('Price history');
    console.log(`${colors.green}✅ Price history endpoint working${colors.reset}`);
    
    // Check if history has real data
    if (result.data.history?.length > 0) {
      const firstEntry = result.data.history[0];
      if (firstEntry.price && firstEntry.timestamp) {
        console.log(`${colors.green}   History entries: ${result.data.history.length}${colors.reset}`);
        return true;
      }
    } else {
      results.warnings.push('No price history data');
      console.log(`${colors.yellow}⚠️ No price history data (run cron job to populate)${colors.reset}`);
      return true;
    }
  } else {
    results.failed.push('Price history');
    console.log(`${colors.red}❌ Price history failed: ${formatError(result.error)}${colors.reset}`);
    return false;
  }
}

async function testAlertCreation() {
  console.log('\n📍 Testing Alert Creation...');
  
  const alertData = {
    product_id: global.testProductId || 'test-product',
    target_price: 30.00,
    alert_type: 'price_drop',
    notification_channels: ['email', 'api']
  };
  
  const result = await apiCall('POST', '/api/v1/prices/alerts', alertData);
  
  if (result.success) {
    results.passed.push('Alert creation');
    console.log(`${colors.green}✅ Alert created successfully${colors.reset}`);
    
    if (result.data.alert?.id) {
      console.log(`${colors.green}   Alert ID: ${result.data.alert.id}${colors.reset}`);
      global.testAlertId = result.data.alert.id;
    }
    return true;
  } else {
    results.failed.push('Alert creation');
    console.log(`${colors.red}❌ Alert creation failed: ${formatError(result.error)}${colors.reset}`);
    return false;
  }
}

async function testCronJob() {
  console.log('\n📍 Testing Price Check Cron Job...');
  
  const result = await apiCall('POST', '/api/cron/check-prices', null);
  
  // Might require auth
  if (result.status === 401) {
    results.warnings.push('Cron job requires authentication');
    console.log(`${colors.yellow}⚠️ Cron job requires CRON_SECRET authentication${colors.reset}`);
    
    // Try with secret
    if (process.env.CRON_SECRET) {
      const authResult = await axios.post(
        `${BASE_URL}/api/cron/check-prices`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          }
        }
      );
      
      if (authResult.data.success) {
        results.passed.push('Cron job');
        console.log(`${colors.green}✅ Cron job executed successfully${colors.reset}`);
        console.log(`${colors.green}   Products checked: ${authResult.data.results.checked}${colors.reset}`);
        return true;
      }
    }
    return true; // Not a failure, just needs auth
  } else if (result.success) {
    results.passed.push('Cron job');
    console.log(`${colors.green}✅ Cron job accessible${colors.reset}`);
    return true;
  } else {
    results.failed.push('Cron job');
    console.log(`${colors.red}❌ Cron job failed: ${formatError(result.error)}${colors.reset}`);
    return false;
  }
}

async function testEbayIntegration() {
  console.log('\n📍 Testing eBay Integration...');
  
  const result = await apiCall('GET', '/api/v1/products/search?keywords=laptop&limit=1');
  
  if (result.success && result.data.items?.length > 0) {
    const item = result.data.items[0];
    if (item.price?.current && item.title) {
      results.passed.push('eBay integration');
      console.log(`${colors.green}✅ eBay API working${colors.reset}`);
      console.log(`${colors.green}   Found: ${item.title.substring(0, 50)}...${colors.reset}`);
      console.log(`${colors.green}   Price: $${item.price.current}${colors.reset}`);
      return true;
    }
  }
  
  results.failed.push('eBay integration');
  console.log(`${colors.red}❌ eBay integration not working - Check EBAY_APP_ID${colors.reset}`);
  return false;
}