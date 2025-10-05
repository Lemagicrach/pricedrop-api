const test = require('node:test');
const assert = require('node:assert/strict');

const SEARCH_MODULE_PATH = require.resolve('../api/v1/products/search');
const EBAY_MODULE_PATH = require.resolve('../lib/ebay');
const MIDDLEWARE_MODULE_PATH = require.resolve('../lib/middleware');
const AUTH_MODULE_PATH = require.resolve('../middleware/auth');

process.env.RAPIDAPI_PROXY_SECRET = 'test-proxy-secret';

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
  const restoreAuth = mockAuth();
  delete require.cache[MIDDLEWARE_MODULE_PATH];
  delete require.cache[SEARCH_MODULE_PATH];
  const handler = require(SEARCH_MODULE_PATH);

  return {
    handler,
    restore: () => {
      restoreEbay();
      restoreAuth();
      delete require.cache[SEARCH_MODULE_PATH];
      delete require.cache[MIDDLEWARE_MODULE_PATH];
    }
  };
}

function mockAuth(impl = async () => true) {
  const originalModule = require.cache[AUTH_MODULE_PATH];

  require.cache[AUTH_MODULE_PATH] = {
    id: AUTH_MODULE_PATH,
    filename: AUTH_MODULE_PATH,
    loaded: true,
    exports: {
      authenticate: impl
    }
  };

  return () => {
    if (originalModule) {
      require.cache[AUTH_MODULE_PATH] = originalModule;
    } else {
      delete require.cache[AUTH_MODULE_PATH];
    }
  };
}

function createRequest(overrides = {}) {
  return {
    method: 'GET',
    headers: {
      'x-rapidapi-key': 'test-key',
      'x-rapidapi-host': 'test-host',
      'x-rapidapi-proxy-secret': process.env.RAPIDAPI_PROXY_SECRET,
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