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
  getUserByApiKey: jest.fn().mockResolvedValue({
    id: 'test-user',
    email: 'test@test.com',
    plan: 'free',
    api_key: 'test-key'
  })
};
