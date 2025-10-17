// tests/api/health.test.js
const healthHandler = require('../../api/v1/core/health');

// Mock the database module
jest.mock('../../lib/services/database', () => ({
  testConnection: jest.fn().mockResolvedValue(true)
}));

describe('GET /api/v1/core/health', () => {
  let req, res;
  
  beforeEach(() => {
    req = {};
    res = {
      body: null,
      statusCode: null,
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        return this;
      }
    };
  });
  
  it('should return 200 and healthy status', async () => {
    await healthHandler(req, res);
    
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toMatch(/healthy|degraded/);
  });
  
  it('should include service information', async () => {
    await healthHandler(req, res);
    
    expect(res.body.service).toBe('PriceDrop API');
    expect(res.body.version).toBeDefined();
  });
  
  it('should include uptime information', async () => {
    await healthHandler(req, res);
    
    expect(res.body.uptime).toBeDefined();
    expect(res.body.uptime.seconds).toBeGreaterThanOrEqual(0);
  });
  
  it('should include system information', async () => {
    await healthHandler(req, res);
    
    expect(res.body.system).toBeDefined();
    expect(res.body.system.memory).toBeDefined();
    expect(res.body.system.cpu).toBeDefined();
  });
  
  it('should include database health check', async () => {
    await healthHandler(req, res);
    
    expect(res.body.checks).toBeDefined();
    expect(res.body.checks.database).toBeDefined();
    expect(res.body.checks.database.status).toBe('healthy');
  });
  
  it('should return 503 when database is unhealthy', async () => {
    // Mock database as unhealthy
    const { testConnection } = require('../../lib/services/database');
    testConnection.mockResolvedValueOnce(false);
    
    await healthHandler(req, res);
    
    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('degraded');
    expect(res.body.checks.database.status).toBe('unhealthy');
  });
  
  it('should handle errors gracefully', async () => {
    // Mock database to throw error
    const { testConnection } = require('../../lib/services/database');
    testConnection.mockRejectedValueOnce(new Error('Connection failed'));
    
    await healthHandler(req, res);
    
    expect(res.statusCode).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('unhealthy');
    expect(res.body.error).toBe('Connection failed');
  });
});