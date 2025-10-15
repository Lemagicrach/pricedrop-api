// validators.js
const { isUrlSupported } = require('./scraper');
const { ERROR_CODES } = require('../config/constants');
const { ValidationError } = require('./utils/validation');

function createError(path, message, code) {
  const normalizedPath = Array.isArray(path) ? path : [path].filter(Boolean);
  return { path: normalizedPath, message, code };
}

function assertIsObject(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError([
      createError(path ?? [], 'Expected object', 'invalid_type')
    ]);
  }
}

function parseBoolean(value, path, errors, defaultValue = false) {
  if (typeof value === 'undefined') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  errors.push(createError(path, 'Expected boolean value', 'invalid_type'));
  return defaultValue;
}

function parseNumber(value, path, errors, { positive = false, integer = false, min, max } = {}) {
  if (typeof value === 'undefined') {
    return undefined;
  }

  const number = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(number)) {
    errors.push(createError(path, 'Expected numeric value', 'invalid_type'));
    return undefined;
  }

  if (positive && number <= 0) {
    errors.push(createError(path, 'Value must be greater than 0', 'too_small'));
  }

  if (typeof min === 'number' && number < min) {
    errors.push(createError(path, `Value must be greater than or equal to ${min}`, 'too_small'));
  }

  if (typeof max === 'number' && number > max) {
    errors.push(createError(path, `Value must be less than or equal to ${max}`, 'too_big'));
  }

  if (integer && !Number.isInteger(number)) {
    errors.push(createError(path, 'Value must be an integer', 'invalid_type'));
  }

  return errors.length ? undefined : number;
}

function parseEmail(value, path, errors, { optional = false } = {}) {
  if (typeof value === 'undefined' || value === null) {
    if (optional) {
      return undefined;
    }

    errors.push(createError(path, 'Email is required', 'invalid_string'));
    return undefined;
  }

  if (typeof value !== 'string' || !isValidEmail(value)) {
    errors.push(createError(path, 'Invalid email address', 'invalid_string'));
    return undefined;
  }

  return value.trim();
}

function parseUuid(value, path, errors, { optional = false } = {}) {
  if (typeof value === 'undefined' || value === null) {
    if (optional) {
      return undefined;
    }

    errors.push(createError(path, 'Value is required', 'invalid_string'));
    return undefined;
  }

  if (typeof value !== 'string') {
    errors.push(createError(path, 'Expected string value', 'invalid_type'));
    return undefined;
  }

  const trimmed = value.trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(trimmed)) {
    errors.push(createError(path, 'Invalid UUID format', 'invalid_string'));
    return undefined;
  }

  return trimmed;
}

function parseUrlValue(value, path, errors, { optional = false } = {}) {
  if (typeof value === 'undefined' || value === null || value === '') {
    if (optional) {
      return undefined;
    }

    errors.push(createError(path, 'URL is required', ERROR_CODES.MISSING_URL));
    return undefined;
  }

  if (typeof value !== 'string') {
    errors.push(createError(path, 'URL must be a string', 'invalid_type'));
    return undefined;
  }

  const trimmed = value.trim();

  try {
    new URL(trimmed);
  } catch {
    errors.push(createError(path, 'Invalid URL format', ERROR_CODES.INVALID_URL));
    return undefined;
  }

  if (!isUrlSupported(trimmed)) {
    errors.push(
      createError(
        path,
        'URL must be from a supported store (Amazon, eBay, Walmart, Target, BestBuy)',
        ERROR_CODES.UNSUPPORTED_STORE
      )
    );
    return undefined;
  }

  return trimmed;
}

const urlSchema = {
  parse(value, path = ['url']) {
    const errors = [];
    const parsed = parseUrlValue(value, path, errors);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    return parsed;
  }
};

const priceCheckSchema = {
  parse(data) {
    assertIsObject(data);
    const errors = [];

    const url = parseUrlValue(data.url, ['url'], errors);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    return { url };
  }
};

const trackProductSchema = {
  parse(data) {
    assertIsObject(data);
    const errors = [];

    const url = parseUrlValue(data.url, ['url'], errors);
    const targetPrice = parseNumber(data.target_price, ['target_price'], errors, { positive: true });
    const notifyOnDrop = parseBoolean(data.notify_on_drop, ['notify_on_drop'], errors, false);

    let email;
    if (typeof data.email !== 'undefined') {
      email = parseEmail(data.email, ['email'], errors, { optional: true });
    }

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const result = { url, notify_on_drop: notifyOnDrop };

    if (typeof targetPrice !== 'undefined') {
      result.target_price = targetPrice;
    }

    if (typeof email !== 'undefined') {
      result.email = email;
    }

    return result;
  }
};

const createAlertSchema = {
  parse(data) {
    assertIsObject(data);
    const errors = [];

    const productId = parseUuid(data.product_id, ['product_id'], errors);
    const targetPrice = parseNumber(data.target_price, ['target_price'], errors, { positive: true });
    const notifyEmail = parseEmail(data.notify_email, ['notify_email'], errors, { optional: true });
    const notifyWebhook = parseUrlValue(data.notify_webhook, ['notify_webhook'], errors, { optional: true });

    if (errors.length) {
      throw new ValidationError(errors);
    }

    const result = { product_id: productId, target_price: targetPrice };

    if (typeof notifyEmail !== 'undefined') {
      result.notify_email = notifyEmail;
    }

    if (typeof notifyWebhook !== 'undefined') {
      result.notify_webhook = notifyWebhook;
    }

    return result;
  }
};

const paginationSchema = {
  parse(data) {
    const errors = [];
    const limit = parseNumber(data?.limit, ['limit'], errors, { integer: true, min: 1, max: 100 });
    const offset = parseNumber(data?.offset, ['offset'], errors, { integer: true, min: 0 });

    if (errors.length) {
      throw new ValidationError(errors);
    }

    return {
      limit: typeof limit === 'number' ? limit : 20,
      offset: typeof offset === 'number' ? offset : 0
    };
  }
};

const productIdSchema = {
  parse(value) {
    const errors = [];
    const result = parseUuid(value, ['product_id'], errors);

    if (errors.length) {
      throw new ValidationError(errors);
    }

    return result;
  }
};

function validateRequest(schema, data) {
  try {
    return {
      success: true,
      data: schema.parse(data)
    };
  } catch (error) {
     if (error instanceof ValidationError) {
      return {
        success: false,
        error: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
      };
    }
    return {
      success: false,
        error: [{
        field: '',
        message: error.message,
        code: 'unknown_error'
      }]
    };
  }
}

function validateUrl(url) {
  try {
    new URL(url);
    return isUrlSupported(url);
  } catch {
    return false;
  }
}

function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().slice(0, maxLength);
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validateApiKey(apiKey) {
  if (!apiKey) {
    return {
      valid: false,
      error: 'API key is required',
      code: 'MISSING_API_KEY'  // Use string instead of ERROR_CODES
    };
  }

  // Simple plan detection based on key pattern
  let plan = 'free';
  if (apiKey.includes('enterprise')) {
    plan = 'enterprise';
  } else if (apiKey.includes('pro')) {
    plan = 'pro';
  } else if (apiKey.includes('basic')) {
    plan = 'basic';
  }

  return {
    valid: true,
    plan: plan,
    key: apiKey
  };
}

module.exports = {
  // Schemas
  urlSchema,
  trackProductSchema,
  priceCheckSchema,
  createAlertSchema,
  paginationSchema,
  productIdSchema,
  
  // Validation functions
  validateRequest,
  validateUrl,
  validateApiKey,
  sanitizeString,
  isValidEmail
};