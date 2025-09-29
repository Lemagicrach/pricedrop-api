const test = require('node:test');
const assert = require('node:assert/strict');

const TRACK_MODULE_PATH = require.resolve('../api/v1/products/track');
const EBAY_MODULE_PATH = require.resolve('../lib/ebay');

function mockEbay(responseFactory, options = {}) {
  const originalModule = require.cache[EBAY_MODULE_PATH];

  class MockEbay {
    constructor(...args) {
      if (options.throwOnConstruct) {
        throw options.throwOnConstruct;
      }

      if (typeof options.onConstruct === 'function') {
        options.onConstruct(...args);
      }
    }

    async getProductDetails(...args) {
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

function loadHandler(responseFactory, options) {
  const restoreEbay = mockEbay(responseFactory, options);
  delete require.cache[TRACK_MODULE_PATH];
  const handler = require(TRACK_MODULE_PATH);

  return {
    handler,
    restore: () => {
      restoreEbay();
      delete require.cache[TRACK_MODULE_PATH];
    }
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'POST',
    headers: {
      'x-rapidapi-key': 'test-key',
      'x-rapidapi-host': 'test-host',
      ...overrides.headers
    },
    body: overrides.body || {},
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

test('track endpoint stores product metadata and returns tracking details', async (t) => {
  const { handler, restore } = loadHandler(async (productId) => {
    assert.equal(productId, '1234567890');

    return {
      success: true,
      product: {
        title: 'Gaming Laptop',
        price: { current: 999.99, currency: 'USD' },
        images: ['https://example.com/item.jpg'],
        seller: { username: 'trusted-seller' }
      }
    };
  });

  t.after(restore);

  const req = createRequest({
    body: {
      url: 'https://www.ebay.com/itm/1234567890',
      target_price: '899.99',
      notify_on_drop: true,
      check_frequency: '12',
      user_email: 'shopper@example.com'
    }
  });

  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.message, 'Product tracking initialized');

  const { tracking, history } = res.body;
  assert.equal(tracking.id, 'ebay:1234567890');
  assert.equal(tracking.url, req.body.url);
  assert.equal(tracking.platform, 'ebay');
  assert.equal(tracking.productId, '1234567890');
  assert.deepEqual(tracking.product, {
    title: 'Gaming Laptop',
    current_price: 999.99,
    currency: 'USD',
    image: 'https://example.com/item.jpg',
    seller: { username: 'trusted-seller' }
  });
  assert.deepEqual(tracking.alerts, {
    target_price: 899.99,
    notify_on_drop: true,
    check_frequency: 12,
    user_email: 'shopper@example.com'
  });
  assert.ok(Date.parse(tracking.createdAt));
  assert.ok(Date.parse(tracking.updatedAt));
  assert.ok(Array.isArray(history));
  assert.equal(history.length, 1);
  assert.equal(history[0].price, 999.99);
  assert.equal(history[0].currency, 'USD');
  assert.ok(Date.parse(history[0].checkedAt));
});

test('track endpoint returns 500 when initialization fails', async (t) => {
  const failure = new Error('Unable to initialize eBay client');
  const { handler, restore } = loadHandler(undefined, { throwOnConstruct: failure });

  t.after(restore);

  const req = createRequest({
    body: {
      url: 'https://www.ebay.com/itm/1234567890'
    }
  });

  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Failed to track product',
    message: 'Unable to initialize eBay client'
  });
});