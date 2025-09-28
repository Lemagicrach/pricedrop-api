const test = require('node:test');
const assert = require('node:assert/strict');

const SEARCH_MODULE_PATH = require.resolve('../api/v1/products/search');
const EBAY_MODULE_PATH = require.resolve('../lib/ebay');

function mockEbay(responseFactory) {
  const originalModule = require.cache[EBAY_MODULE_PATH];

  class MockEbay {
    async searchProducts(...args) {
      if (typeof responseFactory === 'function') {
        return responseFactory(...args);
      }

      return responseFactory;
    }
  }

  require.cache[EBAY_MODULE_PATH] = {
    id: EBAY_MODULE_PATH,
    filename: EBAY_MODULE_PATH,
    loaded: true,
    exports: MockEbay
  };

  return () => {
    if (originalModule) {
      require.cache[EBAY_MODULE_PATH] = originalModule;
    } else {
      delete require.cache[EBAY_MODULE_PATH];
    }
  };
}

function loadHandler(responseFactory) {
  const restoreEbay = mockEbay(responseFactory);
  delete require.cache[SEARCH_MODULE_PATH];
  const handler = require(SEARCH_MODULE_PATH);

  return {
    handler,
    restore: () => {
      restoreEbay();
      delete require.cache[SEARCH_MODULE_PATH];
    }
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'test-key',
      'x-rapidapi-host': 'test-host',
      ...overrides.headers
    },
    query: overrides.query || {},
    ...overrides
  };
}

function createResponse() {
  return {
    statusCode: undefined,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
    }
  };
}

test('search endpoint returns formatted results on success', async (t) => {
  const { handler, restore } = loadHandler(async (keywords, limit, options) => {
    assert.equal(keywords, 'laptop');
    assert.equal(limit, '5');
    assert.deepEqual(options, {
      sortOrder: 'price',
      filters: {}
    });

    return {
      success: true,
      items: [
        {
          itemId: '123',
          title: 'Gaming Laptop',
          price: { value: 1499.99, currency: 'USD' },
          shipping: { cost: 19.99 },
          url: 'https://example.com/item/123',
          image: 'https://example.com/item/123.jpg',
          condition: 'New',
          seller: { username: 'proseller' },
          listing: { type: 'FixedPrice' }
        }
      ]
    };
  });

  t.after(restore);

  const req = createRequest({
    query: {
      keywords: 'laptop',
      limit: '5',
      sortBy: 'price'
    }
  });

  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    query: {
      keywords: 'laptop',
      limit: 5,
      sortBy: 'price'
    },
    count: 1,
    items: [
      {
        id: '123',
        title: 'Gaming Laptop',
        price: {
          current: 1499.99,
          currency: 'USD',
          shipping: 19.99
        },
        url: 'https://example.com/item/123',
        image: 'https://example.com/item/123.jpg',
        condition: 'New',
        seller: { username: 'proseller' },
        listing: { type: 'FixedPrice' }
      }
    ]
  });
});

test('search endpoint reports upstream eBay failures', async (t) => {
  const { handler, restore } = loadHandler(async () => ({
    success: false,
    error: 'eBay is unavailable'
  }));

  t.after(restore);

  const req = createRequest({
    query: {
      keywords: 'camera'
    }
  });

  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 502);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Failed to search products',
    message: 'eBay is unavailable'
  });
});
