// api/v1/prices/alerts.js - Price alerts management
const { withRapidAPI } = require('../../../../lib/middleware');

// In-memory storage (replace with database)
const alerts = new Map();

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

// Create new alert
async function createAlert(req, res) {
  const {
    product_url,       // Product URL to monitor
    target_price,      // Target price
    alert_type,        // 'price_drop', 'back_in_stock', 'any_change'
    notification_channels, // ['email', 'webhook', 'api']
    email,            // Email for notifications
    webhook_url       // Webhook URL for notifications
  } = req.body;
  
  if (!product_url || !target_price) {
    return res.status(400).json({
      success: false,
      error: 'Product URL and target price are required'
    });
  }
  
  // Generate alert ID
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create alert object
  const alert = {
    id: alertId,
    product_url,
    target_price,
    alert_type: alert_type || 'price_drop',
    notification_channels: notification_channels || ['api'],
    email: email || null,
    webhook_url: webhook_url || null,
    status: 'active',
    created_at: new Date().toISOString(),
    last_checked: null,
    triggered: false,
    triggered_at: null,
    trigger_count: 0
  };
  
  // Store alert
  alerts.set(alertId, alert);
  
  res.status(201).json({
    success: true,
    message: 'Alert created successfully',
    alert: {
      id: alertId,
      ...alert
    }
  });
}

// Get alerts
async function getAlerts(req, res) {
  const { status = 'all', triggered } = req.query;
  
  let alertsList = Array.from(alerts.values());
  
  // Filter by status
  if (status !== 'all') {
    alertsList = alertsList.filter(a => a.status === status);
  }
  
  // Filter by triggered state
  if (triggered !== undefined) {
    alertsList = alertsList.filter(a => a.triggered === (triggered === 'true'));
  }
  
  res.json({
    success: true,
    count: alertsList.length,
    alerts: alertsList,
    summary: {
      total: alerts.size,
      active: alertsList.filter(a => a.status === 'active').length,
      triggered: alertsList.filter(a => a.triggered).length
    }
  });
}

// Update alert
async function updateAlert(req, res) {
  const { alert_id } = req.query;
  const updates = req.body;
  
  if (!alert_id) {
    return res.status(400).json({
      success: false,
      error: 'Alert ID is required'
    });
  }
  
  const alert = alerts.get(alert_id);
  if (!alert) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }
  
  // Update alert fields
  Object.assign(alert, updates);
  alert.updated_at = new Date().toISOString();
  
  res.json({
    success: true,
    message: 'Alert updated successfully',
    alert
  });
}

// Delete alert
async function deleteAlert(req, res) {
  const { alert_id } = req.query;
  
  if (!alert_id) {
    return res.status(400).json({
      success: false,
      error: 'Alert ID is required'
    });
  }
  
  if (!alerts.has(alert_id)) {
    return res.status(404).json({
      success: false,
      error: 'Alert not found'
    });
  }
  
  alerts.delete(alert_id);
  
  res.json({
    success: true,
    message: 'Alert deleted successfully'
  });
}