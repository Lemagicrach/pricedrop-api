const {
  generateApiKey,
  hashApiKey,
  isValidKeyFormat
} = require('../../lib/security/apiKeys');

describe('API Key Security', () => {
  describe('generateApiKey', () => {
    it('should generate valid live key', () => {
      const key = generateApiKey('live');
      
      expect(key).toMatch(/^pda_live_[A-Za-z0-9_-]{32}$/);
      expect(key.length).toBe(42);
    });
    
    it('should generate valid test key', () => {
      const key = generateApiKey('test');
      
      expect(key).toMatch(/^pda_test_[A-Za-z0-9_-]{32}$/);
    });
    
    it('should generate unique keys', () => {
      const key1 = generateApiKey('live');
      const key2 = generateApiKey('live');
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('hashApiKey', () => {
    it('should produce consistent hash', () => {
      const key = 'pda_live_test123456789012345678901234';
      const hash1 = hashApiKey(key);
      const hash2 = hashApiKey(key);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64);
    });
    
    it('should produce different hashes for different keys', () => {
      const key1 = 'pda_live_abc123def456ghi789jkl012mno345';
      const key2 = 'pda_live_def456ghi789jkl012mno345pqr678';
      
      expect(hashApiKey(key1)).not.toBe(hashApiKey(key2));
    });
  });
  
  describe('isValidKeyFormat', () => {
    it('should accept valid keys', () => {
      const validKeys = [
        'pda_live_' + 'a'.repeat(32),
        'pda_test_' + 'b'.repeat(32),
        generateApiKey('live'),
        generateApiKey('test')
      ];
      
      validKeys.forEach(key => {
        expect(isValidKeyFormat(key)).toBe(true);
      });
    });
    
    it('should reject invalid keys', () => {
      const invalidKeys = [
        'invalid',
        'pda_live_short',
        'wrong_prefix_' + 'x'.repeat(32),
        null,
        undefined,
        '',
        'pda_live_' + 'a'.repeat(31)
      ];
      
      invalidKeys.forEach(key => {
        expect(isValidKeyFormat(key)).toBe(false);
      });
    });
  });
});