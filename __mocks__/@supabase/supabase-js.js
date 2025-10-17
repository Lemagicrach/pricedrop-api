module.exports = {
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      limit: jest.fn().mockReturnThis()
    })),
    rpc: jest.fn(() => Promise.resolve({ 
      data: { allowed: true, hour_count: 0, day_count: 0 },
      error: null 
    }))
  }))
};
