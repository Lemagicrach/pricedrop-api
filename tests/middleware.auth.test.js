const test = require('node:test');
const assert = require('node:assert/strict');

const AUTH_MODULE_PATH = require.resolve('../middleware/auth');
const RAPIDAPI_MODULE_PATH = require.resolve('../services/rapidapi');

function mockRapidAPI(overrides = {}) {
  const originalModule = require.cache[RAPIDAPI_MODULE_PATH];

  require.cache[RAPIDAPI_MODULE_PATH] = {
    id: RAPIDAPI_MODULE_PATH,
    filename: RAPIDAPI_MODULE_PATH,
    loaded: true,
    exports: {
      verifyRapidAPI: overrides.verifyRapidAPI || (async () => { throw new Error('verifyRapidAPI not mocked'); }),
      checkRateLimit: overrides.checkRateLimit || (async () => true)
    }
  };

  return () => {
    if (originalModule) {
      require.cache[RAPIDAPI_MODULE_PATH] = originalModule;
    } else {
      delete require.cache[RAPIDAPI_MODULE_PATH];
    }
  };
}

function createResponse() {
  return {
    statusCode: undefined,
    payload: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };
}

test('authenticate allows requests with valid RapidAPI key', async () => {
  const restoreRapidAPI = mockRapidAPI({
    verifyRapidAPI: async () => ({
      apiKey: 'valid-key',
      plan: 'pro',
      user: {
        id: 'user-123',
        email: 'user@example.com'
      }
    })
  });

  delete require.cache[AUTH_MODULE_PATH];
  const { authenticate } = require(AUTH_MODULE_PATH);

  const req = {
    method: 'GET',
    url: '/test',
    headers: {
      'x-rapidapi-key': 'valid-key'
    }
  };

  const res = createResponse();

  const result = await authenticate(req, res);

  assert.equal(result, true);
  assert.equal(res.statusCode, undefined);
  assert.equal(res.payload, undefined);
  assert.deepEqual(req.user, {
    apiKey: 'valid-key',
    plan: 'PRO',
    limits: {
      requests_per_hour: 2000,
      requests_per_day: 20000,
      concurrent_tracks: 100
    },
    id: 'user-123',
    email: 'user@example.com'
  });

  restoreRapidAPI();
  delete require.cache[AUTH_MODULE_PATH];
});