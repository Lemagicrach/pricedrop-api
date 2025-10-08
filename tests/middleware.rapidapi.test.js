const test = require('node:test');
const assert = require('node:assert/strict');

const { withRapidAPI } = require('../lib/middleware');

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

test('withRapidAPI skips auth when configured', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProxySecret = process.env.RAPIDAPI_PROXY_SECRET;

  process.env.NODE_ENV = 'production';
  process.env.RAPIDAPI_PROXY_SECRET = 'secret';

  let handlerCalled = false;
  const handler = async (req, res) => {
    handlerCalled = true;
    res.status(200).json({ ok: true });
  };

  const middleware = withRapidAPI(handler, { skipAuth: true });

  const req = { headers: {} };
  const res = createResponse();

  await middleware(req, res);

  assert.equal(handlerCalled, true);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.payload, { ok: true });

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalProxySecret === undefined) {
    delete process.env.RAPIDAPI_PROXY_SECRET;
  } else {
    process.env.RAPIDAPI_PROXY_SECRET = originalProxySecret;
  }
});

test('withRapidAPI enforces RapidAPI headers by default', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalProxySecret = process.env.RAPIDAPI_PROXY_SECRET;

  process.env.NODE_ENV = 'production';
  process.env.RAPIDAPI_PROXY_SECRET = 'secret';

  const handler = async () => {
    throw new Error('handler should not be called');
  };

  const middleware = withRapidAPI(handler);

  const req = { headers: {} };
  const res = createResponse();

  await middleware(req, res);

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.payload, {
    success: false,
    error: 'Unauthorized. Please use RapidAPI to access this API.'
  });

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }

  if (originalProxySecret === undefined) {
    delete process.env.RAPIDAPI_PROXY_SECRET;
  } else {
    process.env.RAPIDAPI_PROXY_SECRET = originalProxySecret;
  }
});