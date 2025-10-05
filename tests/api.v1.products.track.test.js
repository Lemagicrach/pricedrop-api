const test = require('node:test');
const assert = require('node:assert/strict');

const TRACK_MODULE_PATH = require.resolve('../api/v1/products/track');
const EBAY_MODULE_PATH = require.resolve('../lib/ebay');
const MIDDLEWARE_MODULE_PATH = require.resolve('../lib/middleware');
const AUTH_MODULE_PATH = require.resolve('../middleware/auth');

process.env.RAPIDAPI_PROXY_SECRET = 'test-proxy-secret';

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
  const restoreAuth = mockAuth();
  delete require.cache[MIDDLEWARE_MODULE_PATH];
  delete require.cache[TRACK_MODULE_PATH];
  const handler = require(TRACK_MODULE_PATH);

  return {
    handler,
    restore: () => {
      restoreEbay();
      restoreAuth();
      delete require.cache[TRACK_MODULE_PATH];
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
    method: 'POST',
    headers: {
      'x-rapidapi-key': 'test-key',
      'x-rapidapi-host': 'test-host',
      'x-rapidapi-proxy-secret': process.env.RAPIDAPI_PROXY_SECRET,
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