// api/v1/alerts/[id].js
// Routes: GET /api/v1/alerts/123 (get specific alert)
//         PUT /api/v1/alerts/123 (update alert)
//         DELETE /api/v1/alerts/123 (delete alert)

const { protectedRoute } = require('../../../lib/middleware');
const { success, error } = require('../../../lib/utils/response');
const { validateNumber } = require('../../../lib/utils/validation');
const {
  getAlertById,
  updateAlert,
  deleteAlert
} = require('../../../services/database');

module.exports = protectedRoute(async (req, res) => {
  const userId = req.user?.id;
  const alertId = req.query.id; // Vercel provides this from [id]

  if (!userId) {
    return error(res, 'Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!alertId) {
    return error(res, 'Alert ID is required', 400, 'MISSING_ALERT_ID');
  }

  // Verify ownership - IMPORTANT SECURITY CHECK
  const alert = await verifyAlertOwnership(alertId, userId, res);
  if (!alert) return; // Response already sent

  // Route to appropriate handler
  if (req.method === 'GET') {
    return handleGetAlert(req, res, alert);
  }

  if (req.method === 'PUT') {
    return handleUpdateAlert(req, res, alertId, userId);
  }

  if (req.method === 'DELETE') {
    return handleDeleteAlert(req, res, alertId);
  }

  return error(res, 'Method not allowed', 405, 'METHOD_NOT_ALLOWED');
});

// ============================================
// Verify Alert Ownership (Security)
// ============================================
async function verifyAlertOwnership(alertId, userId, res) {
  try {
    const alert = await getAlertById(alertId);

    if (!alert) {
      error(res, 'Alert not found', 404, 'ALERT_NOT_FOUND');
      return null;
    }

    // Check ownership
    if (alert.user_id !== userId) {
      error(res, 'Access denied', 403, 'FORBIDDEN');
      return null;
    }

    return alert;

  } catch (err) {
    console.error('Error verifying alert ownership:', err);

    if (err.message?.includes('not configured')) {
      error(res, 'Database not configured', 503, 'SERVICE_UNAVAILABLE');
      return null;
    }

    error(res, 'Failed to verify alert', 500, 'INTERNAL_ERROR');
    return null;
  }
}

// ============================================
// GET /api/v1/alerts/123 - Get specific alert
// ============================================
async function handleGetAlert(req, res, alert) {
  return success(res, { alert });
}

// ============================================
// PUT /api/v1/alerts/123 - Update alert
// ============================================
async function handleUpdateAlert(req, res, alertId, userId) {
  try {
    const updates = {};

    // Update target price if provided
    if (req.body.target_price !== undefined) {
      updates.target_price = validateNumber(
        req.body.target_price,
        'target_price',
        { min: 0 }
      );
    }

    // Update status if provided
    if (req.body.status) {
      const validStatuses = ['active', 'paused', 'cancelled'];
      if (!validStatuses.includes(req.body.status)) {
        return error(
          res,
          `Status must be one of: ${validStatuses.join(', ')}`,
          400,
          'INVALID_STATUS'
        );
      }
      updates.status = req.body.status;
    }

    // Update notification channels if provided
    if (req.body.notification_channels !== undefined) {
      if (Array.isArray(req.body.notification_channels)) {
        updates.notification_channels = req.body.notification_channels.map(String);
      } else if (typeof req.body.notification_channels === 'string') {
        updates.notification_channels = [req.body.notification_channels];
      } else {
        updates.notification_channels = ['api'];
      }
    }

    // Update email if provided
    if (req.body.email !== undefined) {
      updates.email = req.body.email || null;
    }

    // Update webhook URL if provided
    if (req.body.webhook_url !== undefined) {
      updates.webhook_url = req.body.webhook_url || null;
    }

    // Security: Prevent updating these fields
    delete updates.user_id;
    delete updates.id;
    delete updates.created_at;

    // Add updated timestamp
    updates.updated_at = new Date().toISOString();

    // Check if there's anything to update
    if (Object.keys(updates).length === 1) { // Only updated_at
      return error(res, 'No fields to update', 400, 'NO_UPDATES');
    }

    // Update in database
    const updatedAlert = await updateAlert(alertId, updates);

    return success(res, {
      message: 'Alert updated successfully',
      alert: updatedAlert
    });

  } catch (err) {
    console.error('Error updating alert:', err);

    if (err.name === 'ValidationError') {
      return error(res, err.message, 400, 'VALIDATION_ERROR');
    }

    if (err.message?.includes('not configured')) {
      return error(res, 'Database not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    return error(res, 'Failed to update alert', 500, 'INTERNAL_ERROR');
  }
}

// ============================================
// DELETE /api/v1/alerts/123 - Delete alert
// ============================================
async function handleDeleteAlert(req, res, alertId) {
  try {
    await deleteAlert(alertId);

    return success(res, {
      message: 'Alert deleted successfully'
    });

  } catch (err) {
    console.error('Error deleting alert:', err);

    if (err.message?.includes('not configured')) {
      return error(res, 'Database not configured', 503, 'SERVICE_UNAVAILABLE');
    }

    return error(res, 'Failed to delete alert', 500, 'INTERNAL_ERROR');
  }
}