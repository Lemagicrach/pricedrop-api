// scripts/migrate-database.js - Fixed CommonJS version
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

console.log('🗄️  PriceDrop API Database Migration');
console.log('====================================');
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define all migrations in order
const MIGRATIONS = [
  {
    version: '001',
    name: 'Create api_users table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        api_key_hash TEXT UNIQUE,
        plan TEXT DEFAULT 'free',
        credits_limit INTEGER DEFAULT 100,
        credits_used INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        last_used TIMESTAMPTZ,
        key_created_at TIMESTAMPTZ,
        rate_limit_tier TEXT DEFAULT 'basic',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_users_key_hash ON api_users(api_key_hash);
      CREATE INDEX IF NOT EXISTS idx_api_users_email ON api_users(email);
    `
  },
  {
    version: '002',
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
        original_price DECIMAL(10, 2),
        currency TEXT DEFAULT 'USD',
        in_stock BOOLEAN DEFAULT true,
        last_checked TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
      CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
      CREATE INDEX IF NOT EXISTS idx_products_last_checked ON products(last_checked ASC NULLS FIRST);
      CREATE INDEX IF NOT EXISTS idx_products_platform_checked ON products(platform, last_checked ASC);
    `
  },
  {
    version: '003',
    name: 'Create price_history table',
    sql: `
      CREATE TABLE IF NOT EXISTS price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        price DECIMAL(10, 2) NOT NULL,
        currency TEXT DEFAULT 'USD',
        in_stock BOOLEAN DEFAULT true,
        recorded_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
      CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at DESC);
      CREATE INDEX IF NOT EXISTS idx_price_history_product_date ON price_history(product_id, recorded_at DESC);
    `
  },
  {
    version: '004',
    name: 'Create user_tracking table',
    sql: `
      CREATE TABLE IF NOT EXISTS user_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        target_price DECIMAL(10, 2),
        notify_on_any_drop BOOLEAN DEFAULT true,
        notification_channels TEXT[] DEFAULT ARRAY['email'],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_tracking_user ON user_tracking(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_tracking_product ON user_tracking(product_id);
    `
  },
  {
    version: '005',
    name: 'Create alerts table',
    sql: `
      CREATE TABLE IF NOT EXISTS alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE CASCADE,
        alert_type TEXT NOT NULL DEFAULT 'price_drop',
        target_price DECIMAL(10, 2),
        old_price DECIMAL(10, 2),
        new_price DECIMAL(10, 2),
        status TEXT DEFAULT 'active',
        notification_channels TEXT[] DEFAULT ARRAY['api'],
        email TEXT,
        webhook_url TEXT,
        triggered BOOLEAN DEFAULT false,
        sent BOOLEAN DEFAULT false,
        trigger_count INTEGER DEFAULT 0,
        last_triggered TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent);
      CREATE INDEX IF NOT EXISTS idx_alerts_user_sent ON alerts(user_id, sent, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
    `
  },
  {
    version: '006',
    name: 'Create api_logs table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
        api_key TEXT,
        endpoint TEXT,
        method TEXT,
        status_code INTEGER,
        response_time_ms INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_api_logs_user_created ON api_logs(user_id, created_at DESC);
    `
  },
  {
    version: '007',
    name: 'Create helper functions',
    sql: `
      -- Function to update updated_at timestamp
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = TIMEZONE('utc', NOW());
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function to increment credits atomically
      CREATE OR REPLACE FUNCTION increment_credits(user_id UUID, amount INTEGER)
      RETURNS void AS $$
      BEGIN
        UPDATE api_users
        SET credits_used = credits_used + amount
        WHERE id = user_id;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Function for rate limit checking
      CREATE OR REPLACE FUNCTION check_and_log_request(
        p_user_id UUID,
        p_hour_ago TIMESTAMPTZ,
        p_day_ago TIMESTAMPTZ,
        p_hour_limit INTEGER,
        p_day_limit INTEGER
      )
      RETURNS TABLE(allowed BOOLEAN, hour_count BIGINT, day_count BIGINT) AS $$
      DECLARE
        v_hour_count BIGINT;
        v_day_count BIGINT;
        v_allowed BOOLEAN;
      BEGIN
        SELECT COUNT(*) INTO v_hour_count
        FROM api_logs
        WHERE user_id = p_user_id AND created_at >= p_hour_ago;
        
        SELECT COUNT(*) INTO v_day_count
        FROM api_logs
        WHERE user_id = p_user_id AND created_at >= p_day_ago;
        
        v_allowed := (v_hour_count < p_hour_limit) AND (v_day_count < p_day_limit);
        
        IF v_allowed THEN
          INSERT INTO api_logs (user_id, created_at) VALUES (p_user_id, NOW());
          v_hour_count := v_hour_count + 1;
          v_day_count := v_day_count + 1;
        END IF;
        
        RETURN QUERY SELECT v_allowed, v_hour_count, v_day_count;
      END;
      $$ LANGUAGE plpgsql;
    `
  },
  {
    version: '008',
    name: 'Create triggers',
    sql: `
      DROP TRIGGER IF EXISTS update_api_users_updated_at ON api_users;
      CREATE TRIGGER update_api_users_updated_at
        BEFORE UPDATE ON api_users
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_products_updated_at ON products;
      CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      
      DROP TRIGGER IF EXISTS update_alerts_updated_at ON alerts;
      CREATE TRIGGER update_alerts_updated_at
        BEFORE UPDATE ON alerts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `
  },
  {
    version: '009',
    name: 'Create views',
    sql: `
      CREATE OR REPLACE VIEW recent_price_drops AS
      SELECT
        p.id,
        p.name,
        p.url,
        p.platform,
        p.image_url,
        p.current_price,
        p.currency,
        ph.price AS previous_price,
        (ph.price - p.current_price) AS price_drop_amount,
        ROUND(((ph.price - p.current_price) / ph.price * 100)::numeric, 2) AS price_drop_percentage,
        ph.recorded_at AS previous_price_date,
        p.updated_at AS current_price_date,
        p.in_stock
      FROM products p
      INNER JOIN (
        SELECT DISTINCT ON (product_id)
          product_id,
          price,
          recorded_at
        FROM price_history
        WHERE recorded_at < NOW()
        ORDER BY product_id, recorded_at DESC
      ) ph ON p.id = ph.product_id
      WHERE p.current_price < ph.price
        AND p.updated_at >= NOW() - INTERVAL '30 days'
        AND p.in_stock = true
      ORDER BY price_drop_percentage DESC;
    `
  },
  {
    version: '010',
    name: 'Create demo user',
    sql: `
      INSERT INTO api_users (email, plan, credits_limit)
      VALUES ('demo@pricedrop.api', 'free', 100)
      ON CONFLICT (email) DO NOTHING;
    `
  }
];

/**
 * Run a single migration
 */
async function runMigration(migration) {
  console.log(`\n📦 Running migration ${migration.version}: ${migration.name}`);
  
  try {
    // Execute SQL via RPC
    const { error } = await supabase.rpc('exec_sql', { sql: migration.sql });
    
    if (error) {
      throw error;
    }
    
    console.log(`✅ Migration ${migration.version} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Migration ${migration.version} failed:`, error.message);
    return false;
  }
}

/**
 * Test database connection
 */
async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const { data, error } = await supabase
      .from('api_users')
      .select('count')
      .limit(1);
    
    if (error && !error.message.includes('does not exist')) {
      throw error;
    }
    
    console.log('✅ Connected to Supabase\n');
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

/**
 * Generate SQL file for manual execution
 */
function generateSQLFile() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const filename = `${timestamp}_complete_schema.sql`;
  const filepath = path.join(migrationsDir, filename);
  
  const sqlContent = `-- PriceDrop API Database Schema
-- Generated: ${new Date().toISOString()}
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard
-- 2. Navigate to SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run"
-- ============================================

${MIGRATIONS.map(m => `-- ${m.version}: ${m.name}\n${m.sql}`).join('\n\n')}

-- ============================================
-- Migration complete!
`;
  
  fs.writeFileSync(filepath, sqlContent);
  
  return { filepath, filename };
}

/**
 * Main migration function
 */
async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  // Generate SQL file
  const { filename } = generateSQLFile();
  
  console.log('📄 Generated SQL file for manual execution');
  console.log(`   Location: migrations/${filename}\n`);
  
  console.log('⚠️  The Supabase JavaScript client cannot execute DDL statements.');
  console.log('   Please run the SQL file manually in Supabase SQL Editor.\n');
  
  console.log('Steps to complete migration:');
  console.log('  1. Go to:', SUPABASE_URL);
  console.log('  2. Navigate to SQL Editor (left sidebar)');
  console.log('  3. Click "New Query"');
  console.log(`  4. Copy contents from: migrations/${filename}`);
  console.log('  5. Paste into editor');
  console.log('  6. Click "Run"\n');
  
  // Check current state
  console.log('📊 Checking current database state...\n');
  
  const tables = [
    'api_users',
    'products',
    'price_history',
    'user_tracking',
    'alerts',
    'api_logs'
  ];
  
  let existingTables = 0;
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('count')
      .limit(1);
    
    if (!error) {
      console.log(`  ✅ ${table}`);
      existingTables++;
    } else if (error.message.includes('does not exist')) {
      console.log(`  ❌ ${table} - not found`);
    } else {
      console.log(`  ⚠️  ${table} - ${error.message}`);
    }
  }
  
  console.log(`\n📈 Status: ${existingTables}/${tables.length} tables exist`);
  
  if (existingTables === 0) {
    console.log('\n🚨 ACTION REQUIRED: Run the SQL migration!');
  } else if (existingTables === tables.length) {
    console.log('\n✅ All tables exist! Database is ready.');
  } else {
    console.log('\n⚠️  Partial migration. Please run the full SQL file.');
  }
}

// Run migration
if (require.main === module) {
  main().catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
}

module.exports = { MIGRATIONS, generateSQLFile };