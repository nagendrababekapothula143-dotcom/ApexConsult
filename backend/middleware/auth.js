const { auth } = require('../config/firebase');
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
    // Verify Firebase token
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user exists in DynamoDB by Firebase UID
    let result = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: decodedToken.uid }
    }));

    if (!result.Item) {
      // Check if user exists by email (pre-migration account)
      const { QueryCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
      const existing = await docClient.send(new QueryCommand({
        TableName: 'consulting_users',
        IndexName: 'email-index',
        KeyConditionExpression: 'email = :email',
        ExpressionAttributeValues: { ':email': decodedToken.email.toLowerCase().trim() }
      }));

      if (existing.Items && existing.Items.length > 0) {
        const oldUser = existing.Items[0];
        // Create new item with Firebase UID and delete old one to migrate them
        const migratedUser = { ...oldUser, id: decodedToken.uid };
        await docClient.send(new PutCommand({ TableName: 'consulting_users', Item: migratedUser }));
        await docClient.send(new DeleteCommand({ TableName: 'consulting_users', Key: { id: oldUser.id } }));
        result.Item = migratedUser;
      }
    }

    // If user doesn't exist in our DB yet, they just registered in Firebase but haven't synced
    // We allow them through, but they won't have a role yet. The register route handles syncing.
    req.user = result.Item || { id: decodedToken.uid, email: decodedToken.email };
    
    next();
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
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
