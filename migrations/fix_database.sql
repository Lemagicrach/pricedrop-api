-- =====================================================
-- FIX #1: Disable RLS or Add Proper Policies
-- =====================================================

-- Option A: Disable RLS (simpler for development)
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_logs DISABLE ROW LEVEL SECURITY;

-- Option B: If you want to keep RLS enabled, add policies
-- (Uncomment if you prefer RLS)
/*
-- Allow all operations for service role
CREATE POLICY "Allow all for service role" ON products
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON price_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON user_tracking
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON alerts
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for service role" ON api_logs
  FOR ALL USING (true) WITH CHECK (true);
*/

-- =====================================================
-- FIX #2: Verify/Fix api_users Table
-- =====================================================

-- Drop and recreate api_users with correct schema
DROP TABLE IF EXISTS api_users CASCADE;

CREATE TABLE api_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'free',
  credits_limit INTEGER DEFAULT 100,
  credits_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS on api_users
ALTER TABLE api_users DISABLE ROW LEVEL SECURITY;

-- Recreate demo user
INSERT INTO api_users (email, api_key, plan, credits_limit)
VALUES 
  ('demo@pricedrop.api', 'demo-key-123', 'free', 100),
  ('test@example.com', 'test-key-456', 'free', 100),
  ('pro@example.com', 'test-pro-key', 'pro', 1000)
ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- FIX #3: Recreate Foreign Keys (if needed)
-- =====================================================

-- Recreate user_tracking with new api_users
DROP TABLE IF EXISTS user_tracking CASCADE;

CREATE TABLE user_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  target_price DECIMAL(10, 2),
  notify_on_any_drop BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

ALTER TABLE user_tracking DISABLE ROW LEVEL SECURITY;

-- Recreate alerts with new api_users
DROP TABLE IF EXISTS alerts CASCADE;

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES api_users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  product_url TEXT,
  target_price DECIMAL(10, 2),
  alert_type TEXT NOT NULL DEFAULT 'price_drop',
  notification_channels TEXT[] DEFAULT ARRAY['api'],
  email TEXT,
  webhook_url TEXT,
  status TEXT DEFAULT 'active',
  triggered BOOLEAN DEFAULT false,
  sent BOOLEAN DEFAULT false,
  trigger_count INTEGER DEFAULT 0,
  old_price DECIMAL(10, 2),
  new_price DECIMAL(10, 2),
  last_triggered TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alerts DISABLE ROW LEVEL SECURITY;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_user_tracking_user ON user_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_product ON user_tracking(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_product ON alerts(product_id);
CREATE INDEX IF NOT EXISTS idx_alerts_sent ON alerts(sent);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);

-- Recreate api_logs with new api_users
DROP TABLE IF EXISTS api_logs CASCADE;

CREATE TABLE api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES api_users(id) ON DELETE SET NULL,
  api_key TEXT,
  endpoint TEXT,
  method TEXT,
  status_code INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_logs DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);

-- =====================================================
-- VERIFICATION: Check all tables exist
-- =====================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('products', 'price_history', 'api_users', 'user_tracking', 'alerts', 'api_logs');
  
  IF table_count = 6 THEN
    RAISE NOTICE '✅ All 6 tables exist!';
  ELSE
    RAISE NOTICE '⚠️  Only % tables found', table_count;
  END IF;
END $$;

-- Show table info
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show api_users columns specifically
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'api_users'
ORDER BY ordinal_position;