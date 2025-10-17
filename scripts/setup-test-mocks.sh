#!/bin/bash

echo "🔧 Setting up test mocks..."

# Create mock directories
mkdir -p __mocks__/@supabase
mkdir -p services/__mocks__

# Create Supabase mock
cat > __mocks__/@supabase/supabase-js.js << 'EOF'
module.exports = {
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      limit: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn(() => Promise.resolve({ 
      data: { allowed: true, hour_count: 0, day_count: 0 },
      error: null 
    }))
  }))
};
EOF

# Create database mock
cat > services/__mocks__/database.js << 'EOF'
module.exports = {
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null }))
    })),
    rpc: jest.fn(() => Promise.resolve({ data: null, error: null }))
  },
  createProduct: jest.fn(),
  getProduct: jest.fn(),
  getProducts: jest.fn(),
  getUserByApiKey: jest.fn().mockResolvedValue({
    id: 'test-user',
    email: 'test@test.com',
    plan: 'free',
    api_key: 'test-key'
  })
};
EOF

echo "✅ Mocks created!"
echo "Now run: npm test"