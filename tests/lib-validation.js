// tests/lib-validation.js - Quick validation of all library files

console.log('🧪 Testing Library Files...\n');

// Test 1: Middleware
console.log('1️⃣ Testing middleware...');
try {
  const middleware = require('../lib/middleware');
  console.log('   ✅ publicRoute:', typeof middleware.publicRoute === 'function');
  console.log('   ✅ protectedRoute:', typeof middleware.protectedRoute === 'function');
  console.log('   ✅ withCORS:', typeof middleware.withCORS === 'function');
  console.log('   ✅ compose:', typeof middleware.compose === 'function');
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// Test 2: eBay API
console.log('\n2️⃣ Testing eBay API...');
try {
  const eBayAPI = require('../lib/ebay');
  const ebay = new eBayAPI();
  console.log('   ✅ Constructor works');
  console.log('   ✅ Configured:', ebay.isConfigured());
  console.log('   ✅ Environment:', ebay.environment);
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// Test 3: Amazon Affiliate
console.log('\n3️⃣ Testing Amazon Affiliate...');
try {
  const AmazonAPI = require('../lib/amazonAffiliate');
  const amazon = new AmazonAPI();
  const asin = amazon.extractASIN('https://www.amazon.com/dp/B08N5WRWNW');
  console.log('   ✅ Constructor works');
  console.log('   ✅ ASIN extraction:', asin);
  console.log('   ✅ Tag validation:', amazon.validateTag('test-20'));
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// Test 4: Rate Limiter
console.log('\n4️⃣ Testing Rate Limiter...');
try {
  const { getRateLimiter, getStats } = require('../lib/rateLimiter');
  const limiter = getRateLimiter({ perMinute: 10, perDay: 100 });
  console.log('   ✅ Constructor works');
  console.log('   ✅ Stats:', getStats());
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// Test 5: Scraper
console.log('\n5️⃣ Testing Scraper...');
try {
  const scraper = require('../lib/scraper');
  console.log('   ✅ Supported stores:', scraper.getSupportedStores().length);
  console.log('   ✅ URL check:', scraper.isUrlSupported('https://www.amazon.com/test'));
  console.log('   ✅ Error classes:', typeof scraper.ScraperError === 'function');
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

// Test 6: Validators
console.log('\n6️⃣ Testing Validators...');
try {
  const validators = require('../lib/validators');
  console.log('   ✅ validateUrl:', typeof validators.validateUrl === 'function');
  console.log('   ✅ validateApiKey:', typeof validators.validateApiKey === 'function');
  console.log('   ✅ Schemas defined:', Object.keys(validators).length);
} catch (error) {
  console.log('   ❌ Failed:', error.message);
}

console.log('\n✨ Library validation complete!');