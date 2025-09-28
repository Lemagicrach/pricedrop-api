const test = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../../api/stores');
const {
  HTTP_STATUS,
  ERROR_CODES
} = require('../../config/constants');
const scraper = require('../../lib/scraper');

function createMockRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    status(code) {
      this.statusCode = code;
      return {
        json: (payload) => {
          this.body = payload;
          return this;
        },
        end: () => this
      };
    },
    json(payload) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    }
  };
}

test('stores handler returns supported store metadata', () => {
  const req = { method: 'GET', headers: {} };
  const res = createMockRes();

  handler(req, res);

  assert.equal(res.statusCode, HTTP_STATUS.OK);
  assert.ok(res.body.success);
  assert.ok(Array.isArray(res.body.data.stores));
  assert.equal(res.body.data.stores.length, scraper.getSupportedStores().length);
  assert.ok(res.body.data.last_updated);
  assert.equal(res.body.meta.total_supported, res.body.data.stores.length);
});

test('stores handler gracefully handles internal errors', (t) => {
  const originalGetSupportedStores = scraper.getSupportedStores;
  scraper.getSupportedStores = () => {
    throw new Error('Unexpected failure');
  };

  t.after(() => {
    scraper.getSupportedStores = originalGetSupportedStores;
  });

  const req = { method: 'GET', headers: {} };
  const res = createMockRes();

  handler(req, res);

  assert.equal(res.statusCode, HTTP_STATUS.INTERNAL_SERVER_ERROR);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Internal server error',
    code: ERROR_CODES.INTERNAL_ERROR
  });
});

test('stores handler rejects unsupported methods', () => {
  const req = { method: 'POST', headers: {} };
  const res = createMockRes();

  handler(req, res);

  assert.equal(res.statusCode, HTTP_STATUS.METHOD_NOT_ALLOWED);
  assert.deepEqual(res.body, {
    success: false,
    error: 'Method not allowed. Use GET.',
    code: 'METHOD_NOT_ALLOWED'
  });
});