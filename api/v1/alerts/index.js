// api/v1/alerts/index.js
// Routes: GET /api/v1/alerts (list all alerts)
//         POST /api/v1/alerts (create new alert)

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { 
  validateNumber, 
  validateEmail, 
  validateEnum 
} = require('../../../lib/utils/validation');
const {
  createAlert,
  getAlerts
} = require('../../../services/database');

module.exports = protectedRoute(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return error(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  // Route to appropriate handler
  if (req.method === 'GET') {
    return handleGetAlerts(req, res, userId);
  }

  if (req.method === 'POST') {
    return handleCreateAlert(req, res, userId);
  }

  return error(res, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
});

// ============================================
// GET /api/v1/alerts - List all alerts
// ============================================
async function handleGetAlerts(req, res, userId) {
  try {
    // Parse query parameters
    const page = validateNumber(req.query.page || 1, 'page', { 
      min: 1, 
      integer: true 
    });
    
    const limit = validateNumber(req.query.limit || 20, 'limit', { 
      min: 1, 
      max: 100, 
      integer: true 
    });

    // Parse filters
    const status = req.query.status 
      ? validateEnum(req.query.status, 'status', ['active', 'paused', 'cancelled', 'all'])
      : 'all';

    const triggered = req.query.triggered !== undefined
      ? req.query.triggered === 'true'
      : undefined;

    // Fetch alerts from database
    const alerts = await getAlerts(userId, {
      status,
      triggered,
      limit,
      offset: (page - 1) * limit
    });

    if (!Array.isArray(alerts)) {
      throw new Error('Database returned invalid data');
    }

    // Calculate summary statistics
    const summary = {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      paused: alerts.filter(a => a.status === 'paused').length,
      triggered: alerts.filter(a => a.triggered).length,
      sent: alerts.filter(a => a.sent).length
    };

    return success(res, {
      alerts,
      summary,
      pagination: {
        page,
        limit,
        total: alerts.length
      }
    });

  } catch (err) {
    console.error('Error fetching alerts:', err);
    
    if (err.message?.includes('not configured')) {
      return error(res, 'Database not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    return error(res, 'Failed to fetch alerts', 500, 'INTERNAL_ERROR');
  }
}

// ============================================
// POST /api/v1/alerts - Create new alert
// ============================================
async function handleCreateAlert(req, res, userId) {
  try {
    // Validate required fields
    const productId = req.body.product_id || null;
    const productUrl = req.body.product_url || null;

    if (!productId && !productUrl) {
      return error(
        res,
        'Either product_id or product_url is required',
        400,
        'MISSING_PRODUCT'
      );
    }

    // Validate target price
    const targetPrice = validateNumber(
      req.body.target_price,
      'target_price',
      { min: 0 }
    );

    // Validate alert type
    const alertType = req.body.alert_type
      ? validateEnum(
          req.body.alert_type,
          'alert_type',
          ['price_drop', 'back_in_stock', 'price_target']
        )
      : 'price_drop';

    // Validate notification channels
    let channels = ['api'];
    if (Array.isArray(req.body.notification_channels)) {
      channels = req.body.notification_channels.map(String);
    } else if (typeof req.body.notification_channels === 'string') {
      channels = [req.body.notification_channels];
    }

    // Validate email if provided
    let email = null;
    if (req.body.email) {
      email = validateEmail(req.body.email, 'email');
    }

    // Create alert payload
    const alertPayload = {
      user_id: userId,
      product_id: productId,
      product_url: productUrl,
      target_price: targetPrice,
      alert_type: alertType,
      notification_channels: channels,
      email,
      webhook_url: req.body.webhook_url || null,
      status: 'active',
      triggered: false,
      sent: false,
      trigger_count: 0,
      created_at: new Date().toISOString()
    };

    // Save to database
    const alert = await createAlert(alertPayload);

    return success(
      res,
      {
        message: 'Alert created successfully',
        alert
      },
      201
    );

  } catch (err) {
    console.error('Error creating alert:', err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      return error(res, err.message, 400, 'VALIDATION_ERROR');
    }

    // Handle database errors
    if (err.message?.includes('not configured')) {
      return error(res, 'Database not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    return error(res, 'Failed to create alert', 500, 'INTERNAL_ERROR');
  }
}