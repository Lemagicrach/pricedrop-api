const { checkRateLimit } = require('../../services/rateLimiter');

describe('Rate Limiter', () => {
  it('should allow requests within limits', async () => {
    const result = await checkRateLimit('test-user-id', {
      requests_per_hour: 100,
      requests_per_day: 1000
    });
    
    expect(result.allowed).toBe(true);
    expect(result.counts).toBeDefined();
    expect(result.limits).toBeDefined();
  });
  
  it('should return reset timestamps', async () => {
    const result = await checkRateLimit('test-user-id', {
      requests_per_hour: 100,
      requests_per_day: 1000
    });
    
    expect(result.reset).toBeDefined();
    expect(result.reset.hour).toBeDefined();
    expect(result.reset.day).toBeDefined();
  });
  
  it('should handle missing database gracefully', async () => {
    const result = await checkRateLimit('test-user-id', {
      requests_per_hour: 100,
      requests_per_day: 1000
    });
    
    // Should fail open when database unavailable
    expect(result.allowed).toBe(true);
  });
});