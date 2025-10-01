-- PriceDrop API Database Schema
-- Generated: 2025-10-01T11:48:29.294Z
-- 
-- Instructions:
-- 1. Go to your Supabase Dashboard: https://woijhyhnpspnerizkhoq.supabase.co
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute all migrations
-- ==================================================

-- Create api_users table
CREATE TABLE IF NOT EXISTS api_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      api_key TEXT UNIQUE NOT NULL,
      plan TEXT DEFAULT 'free',
      credits_limit INTEGER DEFAULT 100,
      credits_used INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Create products table
CREATE TABLE IF NOT EXISTS products (
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
    );

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      price DECIMAL(10, 2) NOT NULL,
      currency TEXT DEFAULT 'USD',
      in_stock BOOLEAN DEFAULT true,
      recorded_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Create user_tracking table
CREATE TABLE IF NOT EXISTS user_tracking (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      target_price DECIMAL(10, 2),
      notify_on_any_drop BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      old_price DECIMAL(10, 2),
      new_price DECIMAL(10, 2),
      sent BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

-- Create api_logs table
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_products_url ON products(url);
    CREATE INDEX IF NOT EXISTS idx_products_platform ON products(platform);
    CREATE INDEX IF NOT EXISTS idx_products_last_checked ON products(last_checked);
    CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id);
    CREATE INDEX IF NOT EXISTS idx_price_history_recorded ON price_history(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_user_tracking_user ON user_tracking(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_tracking_product ON user_tracking(product_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent);
    CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = TIMEZONE('utc', NOW());
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_api_users_updated_at ON api_users;
    CREATE TRIGGER update_api_users_updated_at BEFORE UPDATE ON api_users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_products_updated_at ON products;
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create price drops view (FIXED)
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
      p.updated_at DESC;

-- Create demo user
INSERT INTO api_users (email, api_key, plan, credits_limit)
    VALUES ('demo@pricedrop.api', 'demo-key-123', 'free', 100)
    ON CONFLICT (email) DO NOTHING;

-- ==================================================
-- Migration completed!
-- Your database schema is now ready.
