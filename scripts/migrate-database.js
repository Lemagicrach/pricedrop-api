// scripts/migrate-database.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// For ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

console.log('🗄️  PriceDrop API Database Migration');
console.log('====================================');
console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log(`Using Anon Key\n`);

// Test connection
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// All your migrations as SQL
const migrations = [
  {
    name: 'Create api_users table',
    sql: `CREATE TABLE IF NOT EXISTS api_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free',
      credits_limit INTEGER DEFAULT 100,
      credits_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create products table',
    sql: `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      url TEXT UNIQUE NOT NULL,
      platform TEXT NOT NULL,
      external_id TEXT,
      name TEXT,
      description TEXT,
      image_url TEXT,
      current_price DECIMAL(10, 2),
      currency TEXT DEFAULT 'USD',
      in_stock BOOLEAN DEFAULT true,
      last_checked TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create price_history table',
    sql: `CREATE TABLE IF NOT EXISTS price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      price DECIMAL(10, 2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      in_stock BOOLEAN DEFAULT true,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create user_tracking table',
    sql: `CREATE TABLE IF NOT EXISTS user_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      target_price DECIMAL(10, 2),
      notify_on_any_drop BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );`
  },
  {
    name: 'Create alerts table',
    sql: `CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      old_price DECIMAL(10, 2),
      new_price DECIMAL(10, 2),
      sent BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create api_logs table',
    sql: `CREATE TABLE IF NOT EXISTS api_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
      api_key TEXT,
      endpoint TEXT,
      method TEXT,
      status_code INTEGER,
      response_time_ms INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );`
  },
  {
    name: 'Create indexes',
    sql: `CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
    CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
    CREATE INDEX IF NOT EXISTS idx_products_last_checked ON products(last_checked);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_user_tracking_user ON user_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_tracking_product ON user_tracking(product_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);`
  },
  {
    name: 'Create updated_at trigger function',
    sql: `CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = TIMEZONE('utc', NOW());
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;`
  },
  {
    name: 'Add updated_at triggers',
    sql: `DROP TRIGGER IF EXISTS update_api_users_updated_at ON api_users;
    CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`
  },
  {
    name: 'Create price drops view (FIXED)',
    sql: `CREATE OR REPLACE VIEW recent_price_drops AS
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
      EXTRACT(EPOCH FROM (p.updated_at - ph.recorded_at))/3600 AS hours_since_change,
      p.in_stock
    FROM 
      products p
    INNER JOIN (
      SELECT DISTINCT ON (product_id)
        product_id,
        price,
        recorded_at
      FROM 
        price_history
      WHERE 
        recorded_at < NOW()
      ORDER BY 
        product_id, 
        recorded_at DESC
    ) ph ON p.id = ph.product_id
    WHERE 
      p.current_price < ph.price
      AND p.updated_at >= NOW() - INTERVAL '30 days'
      AND p.in_stock = true
    ORDER BY 
      price_drop_percentage DESC,
      p.updated_at DESC;`
  },
  {
    name: 'Create demo user',
    sql: `INSERT INTO api_users (email, api_key, plan, credits_limit)
    VALUES ('demo@pricedrop.api', 'demo-key-123', 'free', 100)
    ON CONFLICT (email) DO NOTHING;`
  }
];

async function testConnection() {
  console.log('🔍 Testing database connection...');
  try {
    // Try a simple query to test connection
    const { data, error } = await supabase.from('api_users').select('count').limit(1);
    
    if (error && error.message.includes('relation "api_users" does not exist')) {
      console.log('✅ Connected to Supabase');
      console.log('⚠️  Tables do not exist yet - need to run migrations\n');
      return true;
    } else if (error) {
      console.log('❌ Connection error:', error.message);
      return false;
    } else {
      console.log('✅ Connected to Supabase');
      console.log('✅ Tables already exist\n');
      return true;
    }
  } catch (err) {
    console.log('❌ Failed to connect:', err.message);
    return false;
  }
}

function generateSQLFile() {
  // Create migrations directory if it doesn't exist
  const migrationsDir = path.join(process.cwd(), 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  // Generate timestamp for filename
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const filename = `${timestamp}_initial_schema.sql`;
  const filepath = path.join(migrationsDir, filename);

  // Combine all migrations into one SQL file
  const sqlContent = `-- PriceDrop API Database Schema
-- Generated: ${new Date().toISOString()}
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard: ${SUPABASE_URL}
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute all migrations
-- ==================================================

${migrations.map(m => `-- ${m.name}\n${m.sql}`).join('\n\n')}

-- ==================================================
-- Migration completed!
-- Your database schema is now ready.
`;

  fs.writeFileSync(filepath, sqlContent);
  
  return { filepath, filename };
}

async function main() {
  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    process.exit(1);
  }

  console.log('⚠️  The Supabase JavaScript client cannot execute DDL statements (CREATE TABLE, etc.)');
  console.log('    This is a known limitation. You have two options:\n');

  // Generate the SQL file
  const { filepath, filename } = generateSQLFile();

  console.log('📄 OPTION 1: Manual Migration (Recommended)');
  console.log('============================================');
  console.log(`✅ Generated SQL file: migrations/${filename}`);
  console.log('\nSteps to complete migration:');
  console.log(`  1. Go to: ${SUPABASE_URL}`);
  console.log('  2. Navigate to "SQL Editor" (left sidebar)');
  console.log('  3. Click "New Query"');
  console.log(`  4. Copy contents of: migrations/${filename}`);
  console.log('  5. Paste into SQL Editor');
  console.log('  6. Click "Run" button\n');

  console.log('💻 OPTION 2: Use Supabase CLI');
  console.log('==============================');
  console.log('Install and setup:');
  console.log('  npm install -g supabase');
  console.log('  supabase init');
  console.log(`  supabase link --project-ref ${SUPABASE_URL.split('.')[0].split('//')[1]}`);
  console.log('  supabase db push\n');

  // Check if tables exist
  console.log('📊 Current Database Status:');
  console.log('============================');
  
  const tables = ['api_users', 'products', 'price_history', 'user_tracking', 'alerts', 'api_logs'];
  let tablesExist = 0;
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('count').limit(1);
    if (!error) {
      console.log(`  ✅ ${table} - exists`);
      tablesExist++;
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log(`  ❌ ${table} - not found`);
    } else {
      console.log(`  ⚠️  ${table} - ${error.message}`);
    }
  }

  console.log(`\n📈 Summary: ${tablesExist}/${tables.length} tables exist`);
  
  if (tablesExist === 0) {
    console.log('\n🚨 ACTION REQUIRED: Please run the migration SQL in Supabase!');
    console.log(`   Open: migrations/${filename}`);
  } else if (tablesExist === tables.length) {
    console.log('\n✅ All tables exist! Your database is ready to use.');
  } else {
    console.log('\n⚠️  Partial migration detected. Some tables are missing.');
    console.log(`   Please run the full migration: migrations/${filename}`);
  }
  
  // Also create a quick reference file
  const quickCopyPath = path.join(process.cwd(), 'MIGRATION_SQL.sql');
  fs.writeFileSync(quickCopyPath, migrations.map(m => m.sql).join('\n\n'));
  console.log('\n📋 Quick copy: Created MIGRATION_SQL.sql in project root for easy copy/paste');
}

main().catch(console.error);