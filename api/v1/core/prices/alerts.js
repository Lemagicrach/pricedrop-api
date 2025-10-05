// api/v1/prices/alerts.js - Price alerts management
const { withRapidAPI } = require('../../../../lib/middleware');

const { AlertService } = require('../../../../services/database');

module.exports = withRapidAPI(async (req, res) => {
  const { method } = req;
  

  switch (method) {
    case 'GET':
      return getAlerts(req, res);
    case 'POST':
      return createAlert(req, res);
    case 'PUT':
      return updateAlert(req, res);
    case 'DELETE':
      return deleteAlert(req, res);
    default:
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
  }
});

function requireUser(req, res) {
  const userId = req.user?.id;

  if (!userId) {
    res.status(401).json({
      success: false,
      error: 'Authentication required to manage alerts'
    });
    return null;
  }

  return userId;
}

function normalizeSupabaseError(error) {
  if (!error) return 'Unknown database error';
  if (typeof error === 'string') return error;
  if (error.message) return error.message;
  try {
    return JSON.stringify(error);
  } catch (serializationError) {
    return 'Unknown database error';
  }
}

function resolveDatabaseStatus(errorMessage) {
  if (!errorMessage) {
    return 500;
  }

  if (typeof errorMessage === 'string' && errorMessage.includes('not configured')) {
    return 503;
  }

  return 500;
}

function coerceNotificationChannels(channels) {
  if (Array.isArray(channels) && channels.length > 0) {
    return channels.map(String);
  }

  if (typeof channels === 'string' && channels.trim()) {
    return [channels.trim()];
  }

  return ['api'];
}

function coerceTargetPrice(value) {
  if (value === undefined || value === null) {
    return undefined;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return NaN;
  }

  return parsed;
}

// Create new alert
async function createAlert(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  const {
    product_id,
    product_url,
    target_price,
    alert_type,
    notification_channels,
    email,
    webhook_url
  } = req.body || {};

  if ((!product_id && !product_url) || target_price === undefined || target_price === null) {
    return res.status(400).json({
      success: false,
      error: 'Product identifier and target price are required'
    });
  }
  
  

  const normalizedPrice = coerceTargetPrice(target_price);
  if (Number.isNaN(normalizedPrice)) {
    return res.status(400).json({
      success: false,
      error: 'Target price must be a valid number'
    });
  }

  const channels = coerceNotificationChannels(notification_channels);

  const alertPayload = {
    user_id: userId,
    product_id: product_id || null,
    product_url: product_url || null,
    target_price: normalizedPrice,
    alert_type: alert_type || 'price_drop',
    notification_channels: channels,
    email: email || null,
    webhook_url: webhook_url || null,
    status: 'active',
    created_at: new Date().toISOString(),
    last_checked: null,
    triggered: false,
    sent: false,
    trigger_count: 0
  };
  
  const { data, error } = await AlertService.create(alertPayload);

  if (error) {
    const message = normalizeSupabaseError(error);
    const status = resolveDatabaseStatus(message);
    return res.status(status).json({
      success: false,
      error: 'Failed to create alert',
      message
    });
  }

  return res.status(201).json({
    success: true,
    message: 'Alert created successfully',
    alert: data
  });
}

// Get alerts
async function getAlerts(req, res) {
  const userId = requireUser(req, res);
  if (!userId) return;

  const { status = 'all', triggered } = req.query || {};

  const triggeredFilter = triggered === undefined
    ? undefined
    : triggered === true || triggered === 'true';

  const { data, error } = await AlertService.listByUser(userId, {
    status,
    triggered: triggeredFilter
  });

  if (error) {
    const message = normalizeSupabaseError(error);
    const responseStatus = resolveDatabaseStatus(message);
    return res.status(responseStatus).json({
      success: false,
      error: 'Failed to load alerts',
      message
    });
  }

  const alerts = data || [];

  const summary = {
    total: alerts.length,
    active: alerts.filter(alert => alert.status === 'active').length,
    triggered: alerts.filter(alert => alert.triggered).length
  };

  return res.json({
    success: true,
    count: alerts.length,
    alerts,
    summary
  });
}

// Update alert
async function updateAlert(req, res) {
 
  const userId = requireUser(req, res);
  if (!userId) return;

  const { alert_id } = req.query || {};
  const updates = { ...(req.body || {}) };

  if (!alert_id) {
    return res.status(400).json({
      success: false,
      error: 'Alert ID is required'
    });
  }


  const { data: existing, error: existingError } = await AlertService.findById(alert_id);

  if (existingError && !existing) {
    const message = normalizeSupabaseError(existingError);
    const status = resolveDatabaseStatus(message);
    return res.status(status === 503 ? status : 404).json({
      success: false,
      error: status === 503 ? 'Failed to load alert' : 'Alert not found',
      message: status === 503 ? message : undefined
    });
  }

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }


  if (existing.user_id && existing.user_id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to modify this alert'
    });
  }

  if ('user_id' in updates) {
    delete updates.user_id;
  }
  if ('id' in updates) {
    delete updates.id;
  }

  if (updates.notification_channels !== undefined) {
    updates.notification_channels = coerceNotificationChannels(updates.notification_channels);
  }

  if (updates.target_price !== undefined) {
    const normalizedPrice = coerceTargetPrice(updates.target_price);
    if (Number.isNaN(normalizedPrice)) {
      return res.status(400).json({
        success: false,
        error: 'Target price must be a valid number'
      });
    }
    updates.target_price = normalizedPrice;
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await AlertService.update(alert_id, updates);

  if (error) {
    const message = normalizeSupabaseError(error);
    const status = resolveDatabaseStatus(message);
    return res.status(status).json({
      success: false,
      error: 'Failed to update alert',
      message
    });
  }

  return res.json({
    success: true,
    message: 'Alert updated successfully',
    alert: data
  });
}

// Delete alert
async function deleteAlert(req, res) {
  
  
  const userId = requireUser(req, res);
  if (!userId) return;

  const { alert_id } = req.query || {};

  if (!alert_id) {
    return res.status(400).json({
      success: false,
      error: 'Alert ID is required'
    });
  }
  

  const { data: existing, error: existingError } = await AlertService.findById(alert_id);

  if (existingError && !existing) {
    const message = normalizeSupabaseError(existingError);
    const status = resolveDatabaseStatus(message);
    return res.status(status === 503 ? status : 404).json({
      success: false,
      error: status === 503 ? 'Failed to load alert' : 'Alert not found',
      message: status === 503 ? message : undefined
    });
  }

  if (!existing) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }
 
  if (existing.user_id && existing.user_id !== userId) {
    return res.status(403).json({
      success: false,
      error: 'You do not have permission to delete this alert'
    });
  }

  const { error } = await AlertService.delete(alert_id);

  if (error) {
    const message = normalizeSupabaseError(error);
    const status = resolveDatabaseStatus(message);
    return res.status(status).json({
      success: false,
      error: 'Failed to delete alert',
      message
    });
  }

  return res.json({
    success: true,
    message: 'Alert deleted successfully'
  });
}