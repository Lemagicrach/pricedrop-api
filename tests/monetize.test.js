// tests/monetize.test.js
const request = require('supertest');
const express = require('express');

// Create a test app instance
const app = express();
app.use(express.json());

// Import the monetize route handler
const monetizeHandler = require('../api/v1/monetize');

// Set up the route for testing
app.post('/api/v1/monetize', monetizeHandler);
app.get('/api/v1/monetize/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

describe('Monetization API', () => {
  describe('POST /api/v1/monetize', () => {
    it('should return 401 when no API key is provided', async () => {
      const response = await request(app)
        .post('/api/v1/monetize')
        .send({
          action: 'ebay_search',
          params: {
            keywords: 'laptop'
          }
        });
      
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 with invalid API key', async () => {
      const response = await request(app)
        .post('/api/v1/monetize')
        .set('x-api-key', 'invalid-key-123')
        .send({
          action: 'ebay_search',
          params: {
            keywords: 'laptop'
          }
        });
      
      expect(response.status).toBe(401);
    });

    it('should return 400 when action is missing', async () => {
      const response = await request(app)
        .post('/api/v1/monetize')
        .set('x-api-key', process.env.TEST_API_KEY || 'test-api-key')
        .send({
          params: {
            keywords: 'laptop'
          }
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should return 400 for unsupported action', async () => {
      const response = await request(app)
        .post('/api/v1/monetize')
        .set('x-api-key', process.env.TEST_API_KEY || 'test-api-key')
        .send({
          action: 'unsupported_action',
          params: {}
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unsupported action');
    });
  });

  describe('GET /api/v1/monetize/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/v1/monetize/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
    });
  });
});