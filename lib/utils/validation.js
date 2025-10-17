// lib/utils/validation.js - Input validation helpers and error types
// Provides consistent validation utilities across API handlers.

const { isUrlSupported } = require('../scraper');

class ValidationError extends Error {
  constructor(errors = [], message = 'Validation failed', status = 400) {
    super(message);
    this.name = 'ValidationError';
    this.errors = Array.isArray(errors) ? errors : [errors];
    this.status = status;
    Error.captureStackTrace(this, ValidationError);
  }
}

const normalizeField = (field) =>
  field && typeof field === 'string' ? field : Array.isArray(field) ? field.join('.') : '';

const buildError = (field, message, code = 'INVALID_INPUT') => ({
  field: normalizeField(field),
  message,
  code
});

const raise = (field, message, code = 'INVALID_INPUT') => {
  throw new ValidationError([buildError(field, message, code)]);
};

const coerceString = (value) =>
  typeof value === 'string' ? value : value === undefined || value === null ? value : String(value);

const validateRequired = (value, field, { trim = true } = {}) => {
  const stringValue = coerceString(value);

  if (stringValue === undefined || stringValue === null) {
    raise(field, `${field} is required`, 'REQUIRED');
  }

  if (trim && typeof stringValue === 'string') {
    const trimmed = stringValue.trim();
    if (!trimmed) {
      raise(field, `${field} cannot be empty`, 'EMPTY_STRING');
    }
    return trimmed;
  }

  if (stringValue === '') {
    raise(field, `${field} cannot be empty`, 'EMPTY_STRING');
  }

  return value;
};

const validateString = (value, field, options = {}) => {
  const { minLength = 0, maxLength, pattern, allowEmpty = false } = options;
  const stringValue = coerceString(value);

  if (stringValue === undefined || stringValue === null) {
    raise(field, `${field} is required`, 'REQUIRED');
  }

  const normalized = String(stringValue);
  const trimmed = normalized.trim();

  if (!allowEmpty && trimmed.length === 0) {
    raise(field, `${field} cannot be empty`, 'EMPTY_STRING');
  }

  if (trimmed.length < minLength) {
    raise(field, `${field} must be at least ${minLength} characters`, 'STRING_TOO_SHORT');
  }

  if (typeof maxLength === 'number' && trimmed.length > maxLength) {
    raise(field, `${field} must be at most ${maxLength} characters`, 'STRING_TOO_LONG');
  }

  if (pattern && !pattern.test(trimmed)) {
    raise(field, `${field} has invalid format`, 'INVALID_FORMAT');
  }

  return trimmed;
};

const validateNumber = (value, field, options = {}) => {
  const { min, max, integer = false, allowNull = false } = options;

  if (value === undefined || value === null) {
    if (allowNull) {
      return null;
    }
    raise(field, `${field} is required`, 'REQUIRED');
  }

  const parsed = typeof value === 'number' ? value : Number(value);

  if (Number.isNaN(parsed)) {
    raise(field, `${field} must be a number`, 'INVALID_NUMBER');
  }

  if (integer && !Number.isInteger(parsed)) {
    raise(field, `${field} must be an integer`, 'INVALID_NUMBER');
  }

  if (typeof min === 'number' && parsed < min) {
    raise(field, `${field} must be greater than or equal to ${min}`, 'NUMBER_TOO_SMALL');
  }

  if (typeof max === 'number' && parsed > max) {
    raise(field, `${field} must be less than or equal to ${max}`, 'NUMBER_TOO_LARGE');
  }

  return parsed;
};

const validateBoolean = (value, field, { defaultValue } = {}) => {
  if (value === undefined || value === null) {
    if (defaultValue !== undefined) {
      return Boolean(defaultValue);
    }
    raise(field, `${field} is required`, 'REQUIRED');
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  raise(field, `${field} must be a boolean`, 'INVALID_BOOLEAN');
};

const validateEmail = (value, field) => {
  const email = validateString(value, field);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    raise(field, `${field} must be a valid email address`, 'INVALID_EMAIL');
  }

  return email.toLowerCase();
};

const validateEnum = (value, field, allowedValues = []) => {
  if (!allowedValues || allowedValues.length === 0) {
    throw new Error(`No enum values provided for ${field}`);
  }

  const normalized = validateString(value, field).toLowerCase();
  const match = allowedValues.find((val) =>
    typeof val === 'string' ? val.toLowerCase() === normalized : val === value
  );

  if (!match) {
    raise(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
      'INVALID_ENUM'
    );
  }

  return typeof match === 'string' ? match : value;
};

const validateUrl = (value, field, { requireSupported = true } = {}) => {
  const url = validateString(value, field);

  let parsed;
  try {
    parsed = new URL(url);
  } catch (err) {
    raise(field, `${field} must be a valid URL`, 'INVALID_URL');
  }

  if (requireSupported && !isUrlSupported(parsed.toString())) {
    raise(field, `${field} must point to a supported store`, 'UNSUPPORTED_STORE');
  }

  return parsed.toString();
};

module.exports = {
  ValidationError,
  validateRequired,
  validateString,
  validateNumber,
  validateBoolean,
  validateEmail,
  validateEnum,
  validateUrl,
  buildError
};