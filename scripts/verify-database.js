// scripts/verify-database.js - Verify Database Setup
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Verifying Database Setup...\n');
console.log('Environment Check:');
console.log(`  SUPABASE_URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
console.log(`  SUPABASE_ANON_KEY: ${supabaseKey ? '✅ Set' : '❌ Missing'}\n`);

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  console.error('   Please add these to your .env.local file:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_ANON_KEY=your_anon_key_here');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyDatabase() {
  const tests = [
    {
      name: 'Products table with platform column',
      test: async () => {
        const { data, error } = await supabase
          .from('products')
          .select('id, url, platform, name')
          .limit(1);
        
        if (error) {
          if (error.message.includes('platform')) {
            throw new Error('Platform column is missing!');
          }
          throw error;
        }
        return true;
      }
    },
    {
      name: 'Insert product with platform',
      test: async () => {
        const testProduct = {
          url: `https://test.com/item-${Date.now()}`,
          platform: 'ebay',
          external_id: `test-${Date.now()}`,
          name: 'Test Product',
          current_price: 19.99
        };
        
        const { data, error } = await supabase
          .from('products')
          .insert(testProduct)
          .select()
          .single();
        
        if (error) throw error;
        
        // Clean up
        await supabase
          .from('products')
          .delete()
          .eq('id', data.id);
        
        return true;
      }
    },
    {
      name: 'Price history table',
      test: async () => {
        const { error } = await supabase
          .from('price_history')
          .select('id')
          .limit(1);
        
        if (error && !error.message.includes('no rows')) throw error;
        return true;
      }
    },
    {
      name: 'API users table',
      test: async () => {
        const { data, error } = await supabase
          .from('api_users')
          .select('id, email, api_key')
          .eq('email', 'demo@pricedrop.api')
          .single();
        
        if (error) throw error;
        if (!data) throw new Error('Demo user not found');
        
        console.log(`    ✓ Demo user exists: ${data.email}`);
        return true;
      }
    },
    {
      name: 'User tracking table',
      test: async () => {
        const { error } = await supabase
          .from('user_tracking')
          .select('id')
          .limit(1);
        
        if (error && !error.message.includes('no rows')) throw error;
        return true;
      }
    },
    {
      name: 'Alerts table',
      test: async () => {
        const { error } = await supabase
          .from('alerts')
          .select('id')
          .limit(1);
        
        if (error && !error.message.includes('no rows')) throw error;
        return true;
      }
    },
    {
      name: 'Recent price drops view',
      test: async () => {
        const { error } = await supabase
          .from('recent_price_drops')
          .select('id, platform')
          .limit(1);
        
        if (error && !error.message.includes('no rows')) throw error;
        return true;
      }
    }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      process.stdout.write(`Testing: ${test.name}... `);
      await test.test();
      console.log('✅ PASSED');
      passed++;
    } catch (error) {
      console.log(`❌ FAILED`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('\n🎉 Database is properly configured!');
    console.log('You can now run the API without errors.\n');
    
    // Test the database service
    console.log('Testing Database Service...');
    try {
      const db = require('../services/database');
      const health = await db.checkDatabaseHealth();
      
      if (health.healthy) {
        console.log('✅ Database service works!');
      } else {
        console.log('⚠️  Database service issue:', health.message);
      }
    } catch (error) {
      console.log('⚠️  Could not test database service:', error.message);
    }
    
  } else {
    console.log('\n❌ Database setup incomplete!');
    console.log('Please run the SQL fix script in Supabase SQL Editor.');
    console.log('\nTo fix:');
    console.log('1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql');
    console.log('2. Run the SQL from migrations/fix_database.sql');
  }
}

// Run verification
verifyDatabase().catch(console.error);