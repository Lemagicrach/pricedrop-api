// scripts/test-ebay.js
require('dotenv').config({ path: '.env.local' });
const eBayAPI = require('../lib/ebay');

async function testEbay() {
  console.log('🧪 Testing eBay API Configuration\n');
  
  const ebay = new eBayAPI();
  
  // Test 1: Configuration
  console.log('1️⃣ Configuration:', ebay.getConfig());
  
  // Test 2: Connection
  console.log('\n2️⃣ Testing connection...');
  const connectionTest = await ebay.testConnection();
  console.log(connectionTest);
  
  // Test 3: Real search
  if (connectionTest.success) {
    console.log('\n3️⃣ Testing real search...');
    const results = await ebay.searchProducts('laptop', 3);
    
    if (results.success) {
      console.log(`✅ Found ${results.count} items`);
      console.log('First item:', results.items[0]?.title);
    } else {
      console.log('❌ Search failed:', results.error);
    }
  }
}

testEbay().catch(console.error);