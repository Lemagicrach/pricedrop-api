const test = require('node:test');
const assert = require('node:assert/strict');
const monetize = require('../api/monetize');

const mockDeps = {
  ebay: {
    searchProducts: async (keywords, limit) => ({
      success: true,
      keywords,
      limit,
      items: [{ itemId: '123', title: 'Test Item' }]
    }),
    getProductDetails: async () => ({
      success: true,
      product: { itemId: '123', title: 'Mock Item' }
    })
  },
  amazon: {
    createAffiliateLink: async () => ({ success: true, affiliateUrl: 'https://amazon.com/mock' }),
    detectRegion: () => 'US',
    amazonDomains: { US: 'amazon.com' },
    generateCategoryLink: () => 'https://amazon.com/b?node=mock'
  }
};

function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    ended: false,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      this.ended = true;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };
}

test('monetize endpoint returns unauthorized for missing API key', async () => {
  const req = {
    method: 'POST',
    headers: {},
    body: {
      action: 'ebay:search',
      keywords: 'camera'
    }
  };
  const res = createMockRes();

  await monetize(req, res, mockDeps);

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'MISSING_API_KEY');
});

test('monetize endpoint routes eBay search action', async () => {
  const req = {
    method: 'POST',
    headers: {
      'x-api-key': 'test-pro-key'
    },
    body: {
      action: 'ebay:search',
      keywords: 'headphones',
      limit: 5
    }
  };
  const res = createMockRes();

  await monetize(req, res, mockDeps);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.action, 'ebay:search');
  assert.deepEqual(res.body.data.items, [{ itemId: '123', title: 'Test Item' }]);
  assert.equal(res.body.plan, 'pro');
});