// scripts/diagnose-ebay.js
require('dotenv').config({ path: '.env.local' });
const axios = require('axios');

async function diagnoseEbay() {
  console.log('🔍 eBay API Diagnostic Tool\n');
  
  const appId = process.env.EBAY_APP_ID;
  const environment = process.env.EBAY_ENVIRONMENT || 'production';
  
  console.log('Configuration:');
  console.log('  App ID:', appId ? `${appId.substring(0, 10)}...` : 'NOT SET');
  console.log('  Environment:', environment);
  console.log('  App ID Length:', appId?.length || 0);
  console.log('  App ID Format:', appId ? 'Set' : 'Missing');
  
  if (!appId) {
    console.log('\n❌ EBAY_APP_ID is not set in .env.local');
    console.log('   Get your App ID from: https://developer.ebay.com/my/keys');
    return;
  }
  
  // Test 1: Try sandbox first
  console.log('\n📍 Test 1: Trying SANDBOX environment...');
  await testEbayAPI(appId, 'sandbox');
  
  // Test 2: Try production
  console.log('\n📍 Test 2: Trying PRODUCTION environment...');
  await testEbayAPI(appId, 'production');
}

async function testEbayAPI(appId, env) {
  const baseUrl = env === 'production' 
    ? 'https://svcs.ebay.com'
    : 'https://svcs.sandbox.ebay.com';
  
  const url = `${baseUrl}/services/search/FindingService/v1`;
  
  const params = {
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': appId,
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': true,
    'keywords': 'laptop',
    'paginationInput.entriesPerPage': 1
  };
  
  try {
    console.log(`  URL: ${url}`);
    console.log(`  Using App ID: ${appId.substring(0, 10)}...`);
    
    const response = await axios.get(url, { 
      params,
      timeout: 15000,
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log(`  Status: ${response.status}`);
    
    if (response.status === 200) {
      const result = response.data.findItemsByKeywordsResponse?.[0];
      
      if (result?.ack?.[0] === 'Success') {
        const itemCount = result.searchResult?.[0]?.['@count'] || 0;
        console.log(`  ✅ SUCCESS! Found ${itemCount} items`);
        
        if (itemCount > 0) {
          const firstItem = result.searchResult[0].item[0];
          console.log(`  First item: ${firstItem.title?.[0]}`);
          console.log(`  Price: $${firstItem.sellingStatus?.[0]?.currentPrice?.[0]?.__value__}`);
        }
        return true;
      } else {
        // eBay returned error
        const errorMsg = result?.errorMessage?.[0]?.error?.[0];
        console.log(`  ❌ eBay Error:`);
        console.log(`     Error ID: ${errorMsg?.errorId?.[0]}`);
        console.log(`     Message: ${errorMsg?.message?.[0]}`);
        console.log(`     Severity: ${errorMsg?.severity?.[0]}`);
        
        // Provide helpful suggestions
        if (errorMsg?.errorId?.[0] === '2') {
          console.log('\n  💡 This error usually means:');
          console.log('     1. Your App ID is for SANDBOX but you\'re using PRODUCTION');
          console.log('     2. Or your App ID is for PRODUCTION but you\'re using SANDBOX');
          console.log('     3. Check your keys at: https://developer.ebay.com/my/keys');
        }
        
        return false;
      }
    } else {
      console.log(`  ❌ HTTP Error ${response.status}`);
      console.log('  Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.log(`  ❌ Request Failed: ${error.message}`);
    if (error.code === 'ECONNABORTED') {
      console.log('     (Connection timeout)');
    }
    return false;
  }
}

diagnoseEbay().catch(console.error);