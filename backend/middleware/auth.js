const { db, auth } = require('../config/firebase');

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
    // Verify Firebase ID token
    let decoded;
    try {
      // In case we are still testing with old custom JWTs (fallback)
      const jwt = require('jsonwebtoken');
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'consulting_jwt_secret_key_987654321_abcdef');
    } catch (jwtErr) {
      // If not a valid old JWT, try Firebase Auth
      decoded = await auth.verifyIdToken(token);
      decoded.id = decoded.uid; // map uid to id for backwards compatibility
    }
    
    // Check if user exists in Firestore
    const userDoc = await db.collection('consulting_users').doc(decoded.id).get();

    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'The user belonging to this token no longer exists.' });
    }
    
    const user = {
      ...userDoc.data(),
      id: userDoc.id,
      _id: userDoc.id
    };

    if (user.status === 'inactive') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support.' });
    }

    // Session check for old tokens
    if (decoded.sessionId) {
      const activeSessions = user.sessions || [];
      const sessionExists = activeSessions.find(s => s.sessionId === decoded.sessionId);
      if (!sessionExists) {
        return res.status(401).json({ success: false, message: 'Session has been revoked or expired. Please log in again.' });
      }
    }

    req.user = user;
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
