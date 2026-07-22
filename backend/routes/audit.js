const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/audit-logs
// @desc    Get all audit logs (Admin only)
// @access  Private/Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const snapshot = await db.collection('consulting_audit_logs').get();
    
    const items = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
    
    // Sort by timestamp descending
    const logs = items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({ success: true, data: logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
