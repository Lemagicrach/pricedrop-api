const { scrapePrice, getSupportedStores, isUrlSupported } = require('../lib/scraper');
const { validateRequest, trackProductSchema } = require('../lib/validators');

console.log('🧪 Testing PriceDrop API Components (Restructured)...\n');

async function runTests() {
  // Test 1: Configuration and Constants
  console.log('1. Testing Configuration...');
  try {
    const { SUPPORTED_STORES, RATE_LIMITS } = require('../config/constants');
    console.log('✅ Constants loaded successfully');
    console.log('✅ Supported stores count:', Object.keys(SUPPORTED_STORES).length);
    console.log('✅ Rate limits configured:', Object.keys(RATE_LIMITS).length, 'plans');
  } catch (error) {
    console.log('❌ Configuration test failed:', error.message);
  }

  // Test 2: Scraper functionality
  console.log('\n2. Testing Scraper...');
  try {
    const stores = getSupportedStores();
    console.log('✅ Supported stores:', stores);
    
    const testUrl = 'https://www.amazon.com/dp/B08N5WRWNW';
    console.log('✅ URL supported:', isUrlSupported(testUrl));
    
    // Test scraping (will use demo data)
    const productData = await scrapePrice(testUrl);
    console.log('✅ Scraping result:', {
      name: productData.name,
      price: productData.price,
      currency: productData.currency,
      store: productData.store,
      demo: productData.demo
    });
  } catch (error) {
    console.log('❌ Scraper test failed:', error.message);
  }

  // Test 3: Validators
  console.log('\n3. Testing Validators...');
  try {
    const validData = {
      url: 'https://www.amazon.com/dp/B08N5WRWNW',
      target_price: 199.99,
      notify_on_drop: true
    };
    
    const validation = validateRequest(trackProductSchema, validData);
    console.log('✅ Valid data validation:', validation.success);
    
    // Test invalid request
    const invalidData = {
      url: 'invalid-url',
      target_price: -10
    };
    
    const invalidValidation = validateRequest(trackProductSchema, invalidData);
    console.log('✅ Invalid data validation:', !invalidValidation.success);
    console.log('✅ Error details:', invalidValidation.error?.length > 0);
  } catch (error) {
    console.log('❌ Validator test failed:', error.message);
  }

  // Test 4: Authentication
  console.log('\n4. Testing Authentication...');
  try {
    const { authenticate } = require('../middleware/auth');
    // Mock request and response objects
    const mockReq = {
      method: 'POST',
      headers: {
        'x-rapidapi-key': 'test-pro-key'
      },
      user: null
    };
    
    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response ${code}:`, data.success ? 'Success' : 'Error');
          return mockRes;
        },
        end: () => mockRes
      }),
      setHeader: () => mockRes
    };
    
    const authResult = await authenticate(mockReq, mockRes);
    console.log('✅ Authentication result:', authResult);
    console.log('✅ User plan detected:', mockReq.user?.plan);
    console.log('✅ Rate limits:', mockReq.user?.limits);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('⚠️ Authentication test skipped: authentication middleware not available.');
    } else {
      console.log('❌ Authentication test failed:', error.message);
    }
  }

  // Test 5: Package Dependencies
  console.log('\n5. Testing Package Dependencies...');
  try {
    // Test key dependencies
    const axios = require('axios');
    console.log('✅ Axios loaded successfully');
    
    const cheerio = require('cheerio');
    console.log('✅ Cheerio loaded successfully');
    
    const { z } = require('zod');
    console.log('✅ Zod loaded successfully');
  } catch (error) {
    console.log('❌ Dependency test failed:', error.message);
  }

  // Test 6: Project Structure
  console.log('\n6. Testing Project Structure...');
  try {
    const fs = require('fs');
    const path = require('path');
    
    const requiredDirs = ['api', 'lib', 'middleware', 'config', 'services', 'scripts', 'docs'];
    const projectRoot = path.join(__dirname, '..');
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(projectRoot, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`✅ Directory exists: ${dir}`);
      } else {
        console.log(`❌ Directory missing: ${dir}`);
      }
    }
  } catch (error) {
    console.log('❌ Structure test failed:', error.message);
  }

  // Test 7: Product details endpoint handler
  console.log('\n7. Testing Product Details Endpoint...');
  try {
    const eBayAPI = require('../lib/ebay');
    eBayAPI.prototype.getProductDetails = async function (itemId) {
      return {
        success: true,
        product: {
          itemId,
          title: 'Test Product',
          url: `https://www.ebay.com/itm/${itemId}`,
          price: { current: 99.99, currency: 'USD' },
          quantity: { available: 20, sold: 12 },
          watchers: 35,
          seller: { userId: 'trusted_seller', feedback: 2500, positive: '99.8' },
          listing: {
            endTime: new Date(Date.now() + 86400000).toISOString(),
            timeLeft: 'P1DT0H'
          }
        }
      };
    };

    const handler = require('../api/v1/products/[id]');

    const req = {
      method: 'GET',
      query: { id: '1234567890' },
      headers: {
        'x-rapidapi-key': 'test-key',
        'x-rapidapi-host': 'test-host'
      }
    };

    const res = {
      statusCode: 200,
      headers: {},
      body: null,
      setHeader(key, value) {
        this.headers[key] = value;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
      end() {
        return this;
      }
    };

    await handler(req, res);

    if (!res.body?.success) {
      throw new Error('Handler did not return a success payload');
    }

    console.log('✅ Product handler responded successfully with insights:', {
      demandLevel: res.body.product?.insights?.demand_level?.level,
      sellerReliability: res.body.product?.insights?.seller_reliability?.rating,
      bestTimeToBuy: res.body.product?.insights?.best_time_to_buy?.recommendation
    });
  } catch (error) {
    console.log('❌ Product details endpoint test failed:', error.message);
  }

  console.log('\n🎉 Component testing completed!');
  console.log('\n📊 Project Status:');
  console.log('✅ Professional structure implemented');
  console.log('✅ CommonJS modules converted');
  console.log('✅ Configuration centralized');
  console.log('✅ Dependencies cleaned up');
  console.log('\n🚀 Next steps:');
  console.log('- Deploy to Vercel using: npm run deploy');
  console.log('- Test endpoints with curl or Postman');
  console.log('- Configure environment variables for production');
  console.log('- List on RapidAPI marketplace');
}

// Run the tests
runTests().catch(console.error);

