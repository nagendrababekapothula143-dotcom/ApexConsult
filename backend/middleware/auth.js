const jwt = require('jsonwebtoken');
const { docClient } = require('../config/dynamodb');
const { GetCommand } = require('@aws-sdk/lib-dynamodb');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    // Verify custom JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'consulting_jwt_secret_key_987654321_abcdef');
    
    // Check if user exists in DynamoDB
    let result = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: decoded.id }
    }));

    if (!result.Item) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }

    if (result.Item.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // Feature 87: Session Management
    // Only check sessions if this JWT has a sessionId (for backward compatibility with old tokens)
    if (decoded.sessionId) {
      const activeSessions = result.Item.sessions || [];
      const sessionExists = activeSessions.find(s => s.sessionId === decoded.sessionId);
      if (!sessionExists) {
        return res.status(401).json({ success: false, message: 'Session has been revoked or expired. Please log in again.' });
      }
    }

    req.user = result.Item;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route`,
      });
    }
    next();
  };
};

// Feature 82: Granular Role-Based Access Control (RBAC)
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    // Super admins implicitly have all permissions
    if (req.user.role === 'admin' && req.user.isSuperAdmin) {
      return next();
    }
    const userPermissions = req.user.permissions || [];
    if (!userPermissions.includes(permission)) {
      return res.status(403).json({ success: false, message: `Missing required permission: ${permission}` });
    }
    next();
  };
};

module.exports = { protect, authorize, requirePermission };
