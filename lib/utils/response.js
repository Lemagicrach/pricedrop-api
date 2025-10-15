// lib/utils/response.js - Standardized Response Helpers
// Last updated: 2025-01-15

/**
 * Send success response
 * @param {Object} res - Response object
 * @param {*} data - Response data
 * @param {number} status - HTTP status code (default 200)
 * @param {Object} meta - Optional metadata
 * @returns {Object} Response object
 */
const success = (res, data, status = 200, meta = {}) => {
  const response = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };

  if (Object.keys(meta).length > 0) {
    response.meta = meta;
  }

  return res.status(status).json(response);
};

/**
 * Send error response
 * @param {Object} res - Response object
 * @param {string} message - Error message
 * @param {number} status - HTTP status code (default 400)
 * @param {string} code - Error code (default 'ERROR')
 * @param {Object} details - Optional error details
 * @returns {Object} Response object
 */
const error = (res, message, status = 400, code = 'ERROR', details = null) => {
  const response = {
    success: false,
    error: {
      message,
      code
    },
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.error.details = details;
  }

  return res.status(status).json(response);
};

/**
 * Send paginated response
 * @param {Object} res - Response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination info
 * @param {number} pagination.total - Total items
 * @param {number} pagination.page - Current page
 * @param {number} pagination.limit - Items per page
 * @param {number} status - HTTP status code (default 200)
 * @returns {Object} Response object
 */
const paginated = (res, data, pagination, status = 200) => {
  const { total, page, limit } = pagination;
  
  return res.status(status).json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Send created response (201)
 * @param {Object} res - Response object
 * @param {*} data - Created resource data
 * @param {string} location - Optional location header
 * @returns {Object} Response object
 */
const created = (res, data, location = null) => {
  if (location) {
    res.setHeader('Location', location);
  }
  
  return success(res, data, 201);
};

/**
 * Send no content response (204)
 * @param {Object} res - Response object
 * @returns {Object} Response object
 */
const noContent = (res) => {
  return res.status(204).end();
};

/**
 * Send not found response (404)
 * @param {Object} res - Response object
 * @param {string} message - Error message
 * @param {string} resource - Resource name
 * @returns {Object} Response object
 */
const notFound = (res, message = 'Resource not found', resource = null) => {
  return error(
    res,
    message,
    404,
    'NOT_FOUND',
    resource ? { resource } : null
  );
};

/**
 * Send unauthorized response (401)
 * @param {Object} res - Response object
 * @param {string} message - Error message
 * @returns {Object} Response object
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401, 'UNAUTHORIZED');
};

/**
 * Send forbidden response (403)
 * @param {Object} res - Response object
 * @param {string} message - Error message
 * @returns {Object} Response object
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403, 'FORBIDDEN');
};

/**
 * Send bad request response (400)
 * @param {Object} res - Response object
 * @param {string} message - Error message
 * @param {Object} errors - Validation errors
 * @returns {Object} Response object
 */
const badRequest = (res, message = 'Bad request', errors = null) => {
  return error(res, message, 400, 'BAD_REQUEST', errors);
};

module.exports = {
  success,
  error,
  paginated,
  created,
  noContent,
  notFound,
  unauthorized,
  forbidden,
  badRequest
};