// scripts/migrate-database.js - Database Setup and Migration Script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  console.log('Please add these to your .env.local file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// SQL statements for creating tables
const migrations = [
  {
    name: 'Create api_users table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        plan TEXT DEFAULT 'free',
        credits_used INTEGER DEFAULT 0,
        credits_limit INTEGER DEFAULT 100,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  },
  {
    name: 'Create products table',
    sql: `
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url TEXT UNIQUE NOT NULL,
        platform TEXT NOT NULL,
        external_id TEXT,
        name TEXT,
        description TEXT,
        image_url TEXT,
        current_price DECIMAL(10, 2),
        lowest_price DECIMAL(10, 2),
        highest_price DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        in_stock BOOLEAN DEFAULT true,
        seller_info JSONB,
        metadata JSONB,
        last_checked TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  },
  {
    name: 'Create price_history table',
    sql: `
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        price DECIMAL(10, 2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        in_stock BOOLEAN DEFAULT true,
        shipping_cost DECIMAL(10, 2),
        seller_info JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  },
  {
    name: 'Create user_tracking table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        target_price DECIMAL(10, 2),
        alert_enabled BOOLEAN DEFAULT true,
        alert_type TEXT DEFAULT 'price_drop',
        check_frequency INTEGER DEFAULT 3600,
        last_notified TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
        UNIQUE(user_id, product_id)
      );
    `
  },
  {
    name: 'Create alerts table',
    sql: `
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        tracking_id UUID REFERENCES user_tracking(id) ON DELETE CASCADE,
        alert_type TEXT NOT NULL,
        old_price DECIMAL(10, 2),
        new_price DECIMAL(10, 2),
        message TEXT,
        notification_channels TEXT[],
        sent BOOLEAN DEFAULT false,
        sent_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  },
  {
    name: 'Create api_logs table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
        api_key TEXT,
        endpoint TEXT NOT NULL,
        method TEXT NOT NULL,
        status_code INTEGER,
        response_time INTEGER,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
      );
    `
  },
  {
    name: 'Create indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
      CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
      CREATE INDEX IF NOT EXISTS idx_products_last_checked ON products(last_checked);
      CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_created_at ON price_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_user_tracking_user_id ON user_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_tracking_product_id ON user_tracking(product_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_id ON alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent);
      CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
    `
  },
  {
    name: 'Create updated_at trigger function',
    sql: `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = TIMEZONE('utc', NOW());
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `
  },
  {
    name: 'Add updated_at triggers',
    sql: `
      DROP TRIGGER IF EXISTS update_api_users_updated_at ON api_users;
      CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_products_updated_at ON products;
      CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_user_tracking_updated_at ON user_tracking;
      CREATE TRIGGER update_user_tracking_updated_at BEFORE UPDATE ON user_tracking
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `
  },
  {
    name: 'Create price drops view',
    sql: `
      CREATE OR REPLACE VIEW recent_price_drops AS
      SELECT 
        p.id,
        p.name,
        p.url,
        p.current_price,
        ph.price as previous_price,
        (ph.price - p.current_price) as drop_amount,
        CASE 
          WHEN ph.price > 0 THEN ((ph.price - p.current_price) / ph.price * 100)
          ELSE 0
        END as drop_percentage,
        p.updated_at
      FROM products p
      JOIN (
        SELECT DISTINCT ON (product_id) 
          product_id, 
          price
        FROM price_history
        WHERE created_at < (NOW() - INTERVAL '1 hour')
        ORDER BY product_id, created_at DESC
      ) ph ON p.id = ph.product_id
      WHERE p.current_price < ph.price
        AND p.updated_at > (NOW() - INTERVAL '24 hours')
      ORDER BY drop_percentage DESC;
    `
  },
  {
    name: 'Create demo user',
    sql: `
      INSERT INTO api_users (email, api_key, plan, credits_limit)
      VALUES ('demo@pricedrop.api', 'demo-key-123', 'free', 100)
      ON CONFLICT (email) DO NOTHING;
    `
  }
];

// Function to run a single migration
async function runMigration(migration) {
  try {
    console.log(`\n🔄 Running: ${migration.name}`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      query: migration.sql
    }).single();
    
    // If RPC doesn't exist, try direct approach (won't work without service key)
    if (error?.message?.includes('exec_sql')) {
      // Note: Direct SQL execution requires service role key
      console.log(`⚠️ Cannot run SQL directly. Please run this in Supabase SQL Editor:`);
      console.log('```sql');
      console.log(migration.sql.substring(0, 200) + '...');
      console.log('```');
      return false;
    }
    
    if (error) {
      console.error(`❌ Failed: ${error.message}`);
      return false;
    }
    
    console.log(`✅ Success: ${migration.name}`);
    return true;
  } catch (err) {
    console.error(`❌ Error: ${err.message}`);
    return false;
  }
}

// Main migration runner
async function migrate() {
  console.log('🗄️ PriceDrop API Database Migration');
  console.log('====================================');
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Using ${supabaseKey.includes('service') ? 'Service' : 'Anon'} Key\n`);
  
  // Test connection
  console.log('🔍 Testing database connection...');
  const { data: test, error: testError } = await supabase
    .from('api_users')
    .select('count')
    .limit(1);
  
  if (testError && !testError.message.includes('relation')) {
    console.error('❌ Cannot connect to Supabase:', testError.message);
    console.log('\nPlease check your SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase\n');
  
  // If tables don't exist, provide SQL for manual execution
  if (testError?.message?.includes('relation')) {
    console.log('📝 Tables do not exist. Creating them now...\n');
    console.log('If automatic migration fails, please run the following SQL in your Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    
    // Generate complete SQL script
    const fullSQL = migrations.map(m => `-- ${m.name}\n${m.sql}`).join('\n\n');
    
    // Save to file
    const fs = require('fs');
    const path = require('path');
    const sqlFile = path.join(__dirname, '..', 'database-schema.sql');
    
    fs.writeFileSync(sqlFile, fullSQL);
    console.log(`\n💾 Full SQL script saved to: ${sqlFile}`);
    console.log('You can copy and paste this into Supabase SQL Editor');
    console.log('='.repeat(60) + '\n');
  }
  
  // Try to run migrations
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n⚠️ Some migrations failed.');
    console.log('This usually means you need to run the SQL manually in Supabase.');
    console.log('\nTo complete setup:');
    console.log('1. Go to your Supabase project');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy the contents of database-schema.sql');
    console.log('4. Run the SQL');
    console.log('\nOr you can use the Supabase CLI:');
    console.log('supabase db push --db-url "' + supabaseUrl + '"');
  } else {
    console.log('\n🎉 All migrations completed successfully!');
    console.log('Your database is ready to use.');
    
    // Test by creating a sample product
    console.log('\n🧪 Testing database with sample data...');
    
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        url: 'https://www.ebay.com/itm/test123',
        platform: 'ebay',
        external_id: 'test123',
        name: 'Test Product (Delete Me)',
        current_price: 99.99
      })
      .select()
      .single();
    
    if (product) {
      console.log('✅ Successfully created test product');
      
      // Clean up
      await supabase
        .from('products')
        .delete()
        .eq('id', product.id);
      
      console.log('✅ Database is fully functional!');
    }
  }
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run: npm run test');
  console.log('2. Deploy: npm run deploy');
  console.log('3. Test the API endpoints');
  console.log('4. List on RapidAPI!\n');
}

// Run migration
migrate().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});