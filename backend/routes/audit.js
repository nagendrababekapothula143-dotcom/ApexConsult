const express = require('express');
const router = express.Router();
const { docClient } = require('../config/dynamodb');
const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/audit-logs
// @desc    Get all audit logs (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: 'consulting_audit_logs'
    });
    
    const response = await docClient.send(command);
    
    // Sort by timestamp descending
    const logs = response.Items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
