const crypto = require('crypto');
const { db } = require('../config/firebase');

/**
 * Global error logger that writes to Firestore
 */
const logError = async (err, req, source = 'Backend') => {
  try {
    const errorLog = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      source,
      message: err.message || 'Unknown Error',
      stack: err.stack || '',
      url: req?.originalUrl || req?.url || 'Unknown URL',
      method: req?.method || 'N/A',
      ipAddress: req?.ip || 'Unknown IP',
      userId: req?.user?.id || req?.user?._id || 'Unauthenticated',
      userRole: req?.user?.role || 'None',
      body: req?.body ? JSON.stringify(req.body) : '',
    };

    // Don't log sensitive passwords
    if (errorLog.body.includes('password')) {
      errorLog.body = '{"redacted": "contains_password"}';
    }

    await db.collection('consulting_error_logs').doc(errorLog.id).set(errorLog);
    
    // Also log to console for development
    console.error(`[ERROR_LOG] ${errorLog.method} ${errorLog.url} - ${errorLog.message}`);
  } catch (loggingError) {
    console.error('Failed to write to error log:', loggingError);
  }
};

module.exports = { logError };
