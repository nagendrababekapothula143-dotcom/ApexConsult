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

module.exports = { protect, authorize };
