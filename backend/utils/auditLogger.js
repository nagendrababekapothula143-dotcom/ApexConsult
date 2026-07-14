const crypto = require('crypto');
const { PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/dynamodb');

/**
 * Logs an action to the audit table.
 * 
 * @param {string} actorId - ID of the user performing the action
 * @param {string} actorName - Name/Email of the user performing the action
 * @param {string} action - Describe the action (e.g., 'ASSIGN_RECRUITER', 'UPLOAD_RESUME')
 * @param {string} targetId - ID of the entity being acted upon (e.g., applicationId, studentId)
 * @param {object} details - Additional metadata (e.g., { previousAssignee: '...', newAssignee: '...' })
 */
const logAuditAction = async (actorId, actorName, action, targetId, details = {}) => {
  try {
    const logEntry = {
      id: crypto.randomUUID(),
      actorId,
      actorName,
      action,
      targetId,
      details,
      timestamp: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_audit_logs',
      Item: logEntry
    }));

    console.log(`[AUDIT LOG] ${action} by ${actorName} on target ${targetId}`);
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
};

module.exports = {
  logAuditAction
};
