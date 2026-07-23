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

// @route   GET /api/audit-logs/export
// @desc    Export audit logs as CSV
// @access  Private/Admin
router.get('/export', protect, authorize('admin'), async (req, res) => {
  try {
    const snapshot = await db.collection('consulting_audit_logs').get();
    const items = snapshot.docs.map(doc => doc.data());
    
    // Sort descending
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // CSV Header
    let csv = 'Timestamp,Actor Name,Actor ID,Action,Target ID,IP Address,Details\n';
    
    // CSV Rows
    items.forEach(log => {
      const timestamp = new Date(log.timestamp).toISOString();
      const actorName = `"${(log.actorName || 'System').replace(/"/g, '""')}"`;
      const actorId = log.actorId || '';
      const action = log.action || '';
      const targetId = log.targetId || '';
      const ip = log.ipAddress || '';
      
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '');
      const detailsEscaped = `"${detailsStr.replace(/"/g, '""')}"`;
      
      csv += `${timestamp},${actorName},${actorId},${action},${targetId},${ip},${detailsEscaped}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs_export.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Export audit logs error:', err);
    res.status(500).json({ success: false, message: 'Server error during export' });
  }
});

module.exports = router;
