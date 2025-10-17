// tests/setup.js - Test setup and mocks
require('dotenv').config({ path: '.env.test' });

// Set test environment variables FIRST
process.env.NODE_ENV = 'test';
process.env.RAPIDAPI_PROXY_SECRET = 'test-secret';
process.env.EBAY_APP_ID = 'test-ebay-id';
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-key';

// Mock Supabase client creation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ 
        data: { 
          id: 'test-user-id',
          email: 'test@example.com',
          plan: 'free',
          credits_limit: 100,
          credits_used: 0,
          is_active: true,
          rate_limit_tier: 'basic'
        }, 
        error: null 
      }))
    })),
    rpc: jest.fn((name, params) => {
      if (name === 'check_and_log_request') {
        return Promise.resolve({ 
          data: { allowed: true, hour_count: 0, day_count: 0 },
          error: null 
        });
      }
      if (name === 'increment_credits') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    }),
    removeAllChannels: jest.fn()
  }))
}));

// Global test timeout
jest.setTimeout(10000);

// Suppress console output in tests (optional)
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: console.log, // Keep log for debugging
  info: console.info,
  debug: console.debug
};

// Global test helpers
global.createMockRequest = (overrides = {}) => {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    params: {},
    ...overrides
  };
};

global.createMockResponse = () => {
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
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    end() {
      return this;
    }
  };
  return res;
};

// Add afterEach cleanup
afterEach(() => {
  jest.clearAllMocks();
});