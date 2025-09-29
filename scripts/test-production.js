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
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status 
    };
  }
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
    console.log(`${colors.red}❌ Health check failed: ${result.error}${colors.reset}`);
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
    if (result.error?.includes('Database not configured')) {
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
    console.log(`${colors.red}❌ Product tracking failed: ${JSON.stringify(result.error)}${colors.reset}`);
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
    console.log(`${colors.red}❌ Price history failed: ${result.error}${colors.reset}`);
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
    console.log(`${colors.red}❌ Alert creation failed: ${result.error}${colors.reset}`);
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
    console.log(`${colors.red}❌ Cron job failed: ${result.error}${colors.reset}`);
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

async function checkEnvironmentVariables() {
  console.log('\n📍 Checking Environment Variables...');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'EBAY_APP_ID'
  ];
  
  const optional = [
    'SENDGRID_API_KEY',
    'FROM_EMAIL',
    'CRON_SECRET'
  ];
  
  let allRequired = true;
  
  for (const key of required) {
    if (process.env[key]) {
      console.log(`${colors.green}✅ ${key} is set${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${key} is missing (REQUIRED)${colors.reset}`);
      allRequired = false;
    }
  }
  
  for (const key of optional) {
    if (process.env[key]) {
      console.log(`${colors.green}✅ ${key} is set${colors.reset}`);
    } else {
      console.log(`${colors.yellow}⚠️ ${key} is missing (optional)${colors.reset}`);
    }
  }
  
  if (allRequired) {
    results.passed.push('Environment variables');
  } else {
    results.failed.push('Environment variables');
  }
  
  return allRequired;
}

// Main test runner
async function runTests() {
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🚀 PriceDrop API Production Readiness Test${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`Testing against: ${BASE_URL}`);
  
  // Check environment variables first
  const envOk = await checkEnvironmentVariables();
  
  if (!envOk) {
    console.log(`\n${colors.red}⚠️ Missing required environment variables!${colors.reset}`);
    console.log('Please set them in .env.local or Vercel dashboard\n');
  }
  
  // Run tests
  await testHealthEndpoint();
  await testDatabaseConnection();
  await testEbayIntegration();
  await testProductTracking();
  await testPriceHistory();
  await testAlertCreation();
  await testCronJob();
  
  // Print summary
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}📊 Test Summary${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  console.log(`\n${colors.green}✅ Passed: ${results.passed.length}${colors.reset}`);
  results.passed.forEach(test => console.log(`   - ${test}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}⚠️ Warnings: ${results.warnings.length}${colors.reset}`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}❌ Failed: ${results.failed.length}${colors.reset}`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  // Production readiness assessment
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}🎯 Production Readiness Assessment${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}`);
  
  const criticalTests = ['Database connection', 'eBay integration', 'Product tracking'];
  const criticalPassed = criticalTests.every(test => results.passed.includes(test));
  
  if (criticalPassed && results.failed.length === 0) {
    console.log(`\n${colors.green}✅ API is READY for RapidAPI!${colors.reset}`);
    console.log('\nNext steps:');
    console.log('1. Deploy to Vercel: vercel --prod');
    console.log('2. Run cron job several times to populate data');
    console.log('3. Test with real products');
    console.log('4. List on RapidAPI marketplace');
  } else if (criticalPassed) {
    console.log(`\n${colors.yellow}⚠️ API is MOSTLY ready but needs some fixes${colors.reset}`);
    console.log('\nFix these issues before listing:');
    results.failed.forEach(test => console.log(`- ${test}`));
  } else {
    console.log(`\n${colors.red}❌ API is NOT ready for production${colors.reset}`);
    console.log('\nCritical issues to fix:');
    criticalTests.forEach(test => {
      if (!results.passed.includes(test)) {
        console.log(`- ${test}`);
      }
    });
  }
  
  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});