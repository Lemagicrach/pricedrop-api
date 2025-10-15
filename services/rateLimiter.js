// Create services/rateLimiter.js
class RateLimiter {
  constructor() {
    this.domainTimestamps = new Map();
    this.minDelay = 2000; // 2 seconds between requests to same domain
  }
  
  async waitForDomain(domain) {
    const lastRequest = this.domainTimestamps.get(domain);
    
    if (lastRequest) {
      const elapsed = Date.now() - lastRequest;
      const remaining = this.minDelay - elapsed;
      
      if (remaining > 0) {
        await new Promise(resolve => setTimeout(resolve, remaining));
      }
    }
    
    this.domainTimestamps.set(domain, Date.now());
  }
  
  getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }
}

const rateLimiter = new RateLimiter();

module.exports = { rateLimiter };