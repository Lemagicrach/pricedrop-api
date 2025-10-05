const test = require('node:test');
const assert = require('node:assert/strict');

const ALERTS_MODULE_PATH = require.resolve('../api/v1/core/prices/alerts');
const DATABASE_MODULE_PATH = require.resolve('../services/database');

function createResponse() {
  return {
    statusCode: 200,
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

function mockDatabase(overrides = {}) {
  const originalModule = require.cache[DATABASE_MODULE_PATH];
  const defaultImpl = {
    createAlert: async () => ({ id: 'alert-001' }),
    getAlerts: async () => [],
    getAlertById: async () => ({ id: 'alert-001', user_id: 'user-123' }),
    updateAlert: async (id, updates) => ({ id, ...updates }),
    deleteAlert: async () => true
  };

  require.cache[DATABASE_MODULE_PATH] = {
    id: DATABASE_MODULE_PATH,
    filename: DATABASE_MODULE_PATH,
    loaded: true,
    exports: { ...defaultImpl, ...overrides }
  };

  return () => {
    if (originalModule) {
      require.cache[DATABASE_MODULE_PATH] = originalModule;
    } else {
      delete require.cache[DATABASE_MODULE_PATH];
    }
  };
}

function loadHandler(databaseOverrides) {
  const restoreDatabase = mockDatabase(databaseOverrides);
  delete require.cache[ALERTS_MODULE_PATH];
  const handler = require(ALERTS_MODULE_PATH);

  return {
    handler,
    restore: () => {
      restoreDatabase();
      delete require.cache[ALERTS_MODULE_PATH];
    }
  };
}

test('GET /api/v1/core/prices/alerts returns alerts for the user', async () => {
  const sampleAlerts = [
    { id: 'alert-1', user_id: 'user-123', status: 'active', triggered: false },
    { id: 'alert-2', user_id: 'user-123', status: 'paused', triggered: true }
  ];

  const { handler, restore } = loadHandler({
    getAlerts: async (userId, options) => {
      assert.equal(userId, 'user-123');
      assert.deepEqual(options, { status: 'all', triggered: undefined });
      return sampleAlerts;
    }
  });

  const req = {
    method: 'GET',
    headers: {},
    query: {},
    user: { id: 'user-123' }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.count, sampleAlerts.length);
  assert.equal(res.body.summary.total, sampleAlerts.length);
  assert.equal(res.body.summary.triggered, 1);

  restore();
});

test('POST /api/v1/core/prices/alerts creates a new alert', async () => {
  const newAlert = { id: 'alert-3', user_id: 'user-123', status: 'active', triggered: false };

  const { handler, restore } = loadHandler({
    createAlert: async payload => {
      assert.equal(payload.user_id, 'user-123');
      assert.equal(payload.target_price, 25);
      assert.deepEqual(payload.notification_channels, ['api']);
      return newAlert;
    }
  });

  const req = {
    method: 'POST',
    headers: {},
    body: {
      product_id: 'product-42',
      target_price: 25
    },
    user: { id: 'user-123' }
  };
  const res = createResponse();

  await handler(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.alert, newAlert);

  restore();
});