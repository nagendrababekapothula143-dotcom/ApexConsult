const express = require('express');

const { docClient } = require('../config/dynamodb');
const { QueryCommand, PutCommand, ScanCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { s3Client, bucketName } = require('../config/s3');
const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logAuditAction } = require('../utils/auditLogger');
const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'consulting_jwt_secret_key_987654321_abcdef', {
    expiresIn: '30d',
  });
};



// @desc    Stream an avatar image securely from S3
// @route   GET /api/auth/avatar/:key
// @access  Public
router.get('/avatar/:key', async (req, res) => {
  const key = req.params.key;
  if (!key) return res.status(400).send('No key provided');
  if (!s3Client) return res.status(500).send('S3 not configured');

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `avatars/${key}`
    });
    const response = await s3Client.send(command);
    
    res.setHeader('Content-Type', response.ContentType || 'image/png');
    if (response.ContentLength) {
      res.setHeader('Content-Length', response.ContentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow embedding from Vercel
    
    // Pipe the S3 stream directly to the Express response
    response.Body.pipe(res);
  } catch (error) {
    // Suppress console error for missing avatars to prevent log spam
    res.status(404).send('Avatar not found');
  }
});

// @desc    Create a new recruiter account
// @route   POST /api/auth/recruiters
// @access  Private (Admin Only)
router.post('/recruiters', protect, authorize('admin'), async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide name, email, and password' });
  }

  try {
    const formattedEmail = email.toLowerCase().trim();

    // 1. Check if user already exists in DynamoDB
    const existing = await docClient.send(new QueryCommand({
      TableName: 'consulting_users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': formattedEmail }
    }));

    if (existing.Items && existing.Items.length > 0) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // 2. Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: formattedEmail,
      password: password,
      displayName: name,
    });

    // 3. Create user in DynamoDB
    const apexId = 'APX' + Math.floor(1000000 + Math.random() * 9000000);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const newUser = {
      id: userRecord.uid,
      apexId,
      name,
      email: formattedEmail,
      role: 'recruiter',
      avatarUrl,
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_users',
      Item: newUser
    }));

    res.status(201).json({
      success: true,
      data: {
        ...newUser,
        _id: newUser.id
      }
    });
  } catch (err) {
    console.error('Create recruiter error:', err);
    // Handle Firebase email already exists specifically
    if (err.code === 'auth/email-already-exists') {
      return res.status(400).json({ success: false, message: 'The email address is already in use by another account.' });
    }
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// @desc    Get all recruiters
// @route   GET /api/auth/recruiters
// @access  Private
router.get('/recruiters', protect, async (req, res) => {
  try {
    const recruiters = await docClient.send(new ScanCommand({
      TableName: 'consulting_users',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'recruiter' }
    }));
    
    // Map _id for frontend compatibility
    const mappedRecruiters = (recruiters.Items || []).map(r => ({
      ...r,
      _id: r.id
    }));

    res.status(200).json({ success: true, data: mappedRecruiters });
  } catch (err) {
    console.error('Fetch recruiters error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching recruiters' });
  }
});

// @desc    Delete a recruiter account
// @route   DELETE /api/auth/recruiters/:id
// @access  Private (Admin Only)
router.delete('/recruiters/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const userId = req.params.id;

    // 1. Fetch user to confirm they exist and are a recruiter
    const user = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: userId }
    }));

    if (!user.Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.Item.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'You can only delete recruiter accounts.' });
    }

    // 2. Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: 'consulting_users',
      Key: { id: userId }
    }));

    res.status(200).json({ success: true, message: 'Recruiter successfully deleted' });
  } catch (err) {
    console.error('Delete recruiter error:', err);
    res.status(500).json({ success: false, message: `Server error: ${err.message}` });
  }
});

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body; 

  if (!email || !password || !name) {
    return res.status(400).json({ success: false, message: 'Please provide all required fields' });
  }

  try {
    const formattedEmail = email.toLowerCase().trim();

    // Check if user exists using GSI
    const existing = await docClient.send(new QueryCommand({
      TableName: 'consulting_users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': formattedEmail }
    }));

    if (existing.Items && existing.Items.length > 0) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const userId = crypto.randomUUID();
    const apexId = 'APX' + Math.floor(1000000 + Math.random() * 9000000);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;

    if (req.body.avatarBase64 && s3Client) {
      try {
        const base64Data = req.body.avatarBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `avatars/${userId}-${Date.now()}.png`;

        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentEncoding: 'base64',
          ContentType: 'image/png'
        }));

        avatarUrl = `S3_KEY:${key.replace('avatars/', '')}`;
      } catch (uploadError) {
        console.error('Failed to upload custom avatar, falling back to UI Avatar:', uploadError);
      }
    }

    const newUser = {
      id: userId,
      apexId,
      name: name,
      email: formattedEmail,
      password: hashedPassword,
      role: 'student', // Force student role to prevent privilege escalation
      avatarUrl,
      createdAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: 'consulting_users',
      Item: newUser
    }));

    usersCache.del('students');

    await logAuditAction(
      userId,
      newUser.name,
      'REGISTER_ACCOUNT',
      userId,
      { role: newUser.role, email: newUser.email }
    );

    res.status(201).json({
      success: true,
      token: generateToken(userId),
      data: {
        _id: userId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatarUrl
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    const formattedEmail = email.toLowerCase().trim();

    // Find user by email
    const existing = await docClient.send(new QueryCommand({
      TableName: 'consulting_users',
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': formattedEmail }
    }));

    if (!existing.Items || existing.Items.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = existing.Items[0];

    // Handle legacy users (from Firebase) who don't have a password in DynamoDB
    if (!user.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Update them in DynamoDB with the fallback password
      await docClient.send(new PutCommand({
        TableName: 'consulting_users',
        Item: { ...user, password: hashedPassword }
      }));

      return res.status(401).json({ success: false, message: 'Your account was migrated from our old system. Your temporary password is: password123. Please log in with that and change it immediately.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Require 2FA for admins and recruiters
    if (user.role === 'admin' || user.role === 'recruiter') {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      twoFactorStore.set(user.id, {
        otp,
        expires: Date.now() + 5 * 60 * 1000 // 5 minutes
      });

      // MOCK EMAIL SEND (In a real app, use SendGrid/SES)
      console.log(`\n=========================================`);
      console.log(`📧 MOCK EMAIL SENT TO: ${user.email}`);
      console.log(`🔒 Your 2FA Login Code is: ${otp}`);
      console.log(`=========================================\n`);

      return res.status(200).json({
        success: true,
        require2FA: true,
        userId: user.id,
        message: 'A 6-digit OTP has been sent to your email.'
      });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user.id),
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Verify 2FA OTP
// @route   POST /api/auth/verify-2fa
// @access  Public
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, otp } = req.body;
    
    if (!userId || !otp) {
       return res.status(400).json({ success: false, message: 'Missing userId or otp' });
    }

    const stored2FA = twoFactorStore.get(userId);

    if (!stored2FA) {
      return res.status(400).json({ success: false, message: 'OTP session expired or not found. Please log in again.' });
    }

    if (Date.now() > stored2FA.expires) {
      twoFactorStore.delete(userId);
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    if (stored2FA.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    // Success! Clear the OTP.
    twoFactorStore.delete(userId);

    // Get user details
    const result = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: userId }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await logAuditAction(
      userId,
      result.Item.name,
      'VERIFY_2FA',
      userId,
      { success: true }
    );

    res.status(200).json({
      success: true,
      token: generateToken(userId),
      data: {
        _id: userId,
        name: result.Item.name,
        email: result.Item.email,
        role: result.Item.role,
        avatarUrl: result.Item.avatarUrl
      },
    });
  } catch (error) {
    console.error('2FA error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    res.status(200).json({ success: true, data: req.user });
  } catch (error) {
    console.error('Fetch me error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

const NodeCache = require('node-cache');
const usersCache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // 60 seconds caching

// In-memory 2FA store for mock email delivery
// Key: userId, Value: { otp: string, expires: number }
const twoFactorStore = new Map();

// @desc    Get all students
// @route   GET /api/auth/students
// @access  Private (Admin & Recruiter)
router.get('/students', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    if (usersCache.has('students')) {
      return res.status(200).json(usersCache.get('students'));
    }

    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_users',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'student' }
    }));

    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
    const students = await Promise.all((result.Items || []).map(async (student) => {
      let currentApexId = student.apexId;
      
      // Retroactively assign apexId to legacy students
      if (!currentApexId) {
        currentApexId = 'APX' + Math.floor(1000000 + Math.random() * 9000000);
        try {
          await docClient.send(new UpdateCommand({
            TableName: 'consulting_users',
            Key: { id: student.id },
            UpdateExpression: 'set apexId = :apexId',
            ExpressionAttributeValues: { ':apexId': currentApexId }
          }));
        } catch (updateErr) {
          console.error('Failed to retroactively assign apexId:', updateErr);
        }
      }

      return {
        ...student,
        apexId: currentApexId,
        _id: student.id // Maintain compatibility with frontend
      };
    }));
    
    students.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const responseData = { success: true, count: students.length, data: students };
    usersCache.set('students', responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all admins
// @route   GET /api/auth/admins
// @access  Private (Admin & Recruiter)
router.get('/admins', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    if (usersCache.has('admins')) {
      return res.status(200).json(usersCache.get('admins'));
    }

    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_users',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'admin' }
    }));

    const admins = (result.Items || []).map(admin => ({
      ...admin,
      _id: admin.id // Maintain compatibility with frontend
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const responseData = { success: true, count: admins.length, data: admins };
    usersCache.set('admins', responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all recruiters
// @route   GET /api/auth/recruiters
// @access  Private (Admin & Recruiter)
router.get('/recruiters', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    if (usersCache.has('recruiters')) {
      return res.status(200).json(usersCache.get('recruiters'));
    }

    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_users',
      FilterExpression: '#role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': 'recruiter' }
    }));

    const recruiters = (result.Items || []).map(recruiter => ({
      ...recruiter,
      _id: recruiter.id // Maintain compatibility with frontend
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const responseData = { success: true, count: recruiters.length, data: recruiters };
    usersCache.set('recruiters', responseData);

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch recruiters error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a student
// @route   DELETE /api/auth/students/:id
// @access  Private (Admin only)
router.delete('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const { DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const { deleteS3Object } = require('../config/s3');
    
    // 1. Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: 'consulting_users',
      Key: { id: studentId }
    }));

    // 3. Delete all applications & S3 resumes for this student
    const appsResult = await docClient.send(new ScanCommand({
      TableName: 'consulting_applications',
      FilterExpression: 'student = :studentId OR studentId = :studentId',
      ExpressionAttributeValues: { ':studentId': studentId }
    }));

    if (appsResult.Items && appsResult.Items.length > 0) {
      for (const app of appsResult.Items) {
        if (app.resumeKey) {
          await deleteS3Object(app.resumeKey);
        }
        await docClient.send(new DeleteCommand({
          TableName: 'consulting_applications',
          Key: { id: app.id }
        }));
      }
    }

    // Clear cache
    usersCache.del('students');

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update user password
// @route   PATCH /api/auth/update-password
// @access  Private
router.patch('/update-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both current and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
    // Get user from DB
    const result = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: userId }
    }));

    if (!result.Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Legacy users who haven't set a password yet will have 'password123' if they just logged in,
    // but if they bypassed login (already had a token), they might have no password field at all.
    // We handle this gracefully.
    if (result.Item.password) {
      const isMatch = await bcrypt.compare(currentPassword, result.Item.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Incorrect current password' });
      }
    } else {
      // If no password exists, assume currentPassword is 'password123' which they were told to use
      if (currentPassword !== 'password123') {
        return res.status(400).json({ success: false, message: 'Incorrect current password. Please use password123 as your temporary password.' });
      }
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);

    // Update DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: 'consulting_users',
      Key: { id: userId },
      UpdateExpression: 'set password = :pwd',
      ExpressionAttributeValues: { ':pwd': hashedNewPassword }
    }));

    await logAuditAction(
      userId,
      req.user.name,
      'UPDATE_PASSWORD',
      userId,
      {}
    );

    res.status(200).json({ success: true, message: 'Password successfully updated' });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a student's status (active/inactive)
// @route   PATCH /api/auth/students/:id/status
// @access  Private (Admin only)
router.patch('/students/:id/status', protect, authorize('admin'), async (req, res) => {
  try {
    const studentId = req.params.id;
    const { status } = req.body; // 'active' or 'inactive'
    
    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    await docClient.send(new UpdateCommand({
      TableName: 'consulting_users',
      Key: { id: studentId },
      UpdateExpression: 'set #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':status': status || 'active' }
    }));

    // Clear cache
    usersCache.del('students');

    res.status(200).json({ success: true, message: 'Student status updated' });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a user's profile
// @route   PATCH /api/auth/profile/:id
// @access  Private (User themselves or Admin)
router.patch('/profile/:id', protect, async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const requesterId = req.user.id || req.user._id;
    const requesterRole = req.user.role;

    if (requesterId !== userIdToUpdate && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
    }

    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

    // Recursively remove empty strings and empty objects for DynamoDB compatibility
    const cleanEmptyStrings = (obj) => {
      if (obj === '') return undefined;
      
      if (Array.isArray(obj)) {
        return obj
          .map(cleanEmptyStrings)
          .filter(item => item !== undefined);
      }
      
      if (obj !== null && typeof obj === 'object') {
        const newObj = {};
        let hasKeys = false;
        for (const key in obj) {
          const cleanedVal = cleanEmptyStrings(obj[key]);
          if (cleanedVal !== undefined) {
            newObj[key] = cleanedVal;
            hasKeys = true;
          }
        }
        return hasKeys ? newObj : undefined;
      }
      return obj;
    };

    const allowedFields = [
      'name', 'phone', 'university', 'major', 'location', 
      'linkedinUrl', 'portfolioUrl', 'education', 'experience', 
      'projects', 'technicalSkills', 'softSkills', 'certifications',
      'avatarUrl'
    ];

    if (req.body.avatarBase64 && s3Client) {
      try {
        const base64Data = req.body.avatarBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `avatars/${userIdToUpdate}-${Date.now()}.png`;

        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: buffer,
          ContentEncoding: 'base64',
          ContentType: 'image/png'
        }));

        req.body.avatarUrl = `S3_KEY:${key.replace('avatars/', '')}`;
      } catch (uploadError) {
        console.error('Failed to upload custom avatar during profile update:', uploadError);
      }
    }

    let updateExprSet = [];
    let updateExprRemove = [];
    let exprAttrNames = {};
    let exprAttrVals = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const cleaned = cleanEmptyStrings(req.body[field]);
        if (cleaned === undefined) {
          updateExprRemove.push(`#${field}`);
          exprAttrNames[`#${field}`] = field;
        } else {
          updateExprSet.push(`#${field} = :${field}`);
          exprAttrNames[`#${field}`] = field;
          exprAttrVals[`:${field}`] = cleaned;
        }
      }
    });

    let updateExpr = '';
    if (updateExprSet.length > 0) {
      updateExpr += 'SET ' + updateExprSet.join(', ');
    }
    if (updateExprRemove.length > 0) {
      updateExpr += (updateExpr ? ' ' : '') + 'REMOVE ' + updateExprRemove.join(', ');
    }

    if (!updateExpr) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }

    const params = {
      TableName: 'consulting_users',
      Key: { id: userIdToUpdate },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprAttrNames,
      ReturnValues: 'ALL_NEW'
    };

    if (Object.keys(exprAttrVals).length > 0) {
      params.ExpressionAttributeValues = exprAttrVals;
    }

    const result = await docClient.send(new UpdateCommand(params));

    // Clear caches
    usersCache.del('students');
    usersCache.del('admins');

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: result.Attributes });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Update a user's role (Admin only)
// @route   PATCH /api/auth/profile/:id/role
// @access  Private (Admin only)
router.patch('/profile/:id/role', protect, authorize('admin'), async (req, res) => {
  try {
    const userIdToUpdate = req.params.id;
    const { role } = req.body;

    if (!role || !['admin', 'recruiter', 'student'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
    await docClient.send(new UpdateCommand({
      TableName: 'consulting_users',
      Key: { id: userIdToUpdate },
      UpdateExpression: 'set #role = :role',
      ExpressionAttributeNames: { '#role': 'role' },
      ExpressionAttributeValues: { ':role': role }
    }));

    // Clear caches
    usersCache.del('students');
    usersCache.del('admins');
    usersCache.del('recruiters');

    res.status(200).json({ success: true, message: 'Role updated successfully' });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Toggle job bookmark
// @route   POST /api/auth/profile/bookmark/:jobId
// @access  Private (Student only)
router.post('/profile/bookmark/:jobId', protect, authorize('student'), async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user.id || req.user._id;

    // Get current user to check bookmarks array
    const userRes = await docClient.send(new GetCommand({
      TableName: 'consulting_users',
      Key: { id: userId }
    }));

    if (!userRes.Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentBookmarks = userRes.Item.bookmarkedJobs || [];
    let newBookmarks;
    let isBookmarked = false;

    if (currentBookmarks.includes(jobId)) {
      // Remove bookmark
      newBookmarks = currentBookmarks.filter(id => id !== jobId);
    } else {
      // Add bookmark
      newBookmarks = [...currentBookmarks, jobId];
      isBookmarked = true;
    }


    await docClient.send(new UpdateCommand({
      TableName: 'consulting_users',
      Key: { id: userId },
      UpdateExpression: 'set bookmarkedJobs = :bookmarkedJobs',
      ExpressionAttributeValues: { ':bookmarkedJobs': newBookmarks }
    }));

    // Update req.user in memory for this request if needed
    req.user.bookmarkedJobs = newBookmarks;

    // Clear caches
    usersCache.del('students');

    res.status(200).json({ 
      success: true, 
      message: isBookmarked ? 'Job bookmarked' : 'Bookmark removed', 
      bookmarkedJobs: newBookmarks 
    });
  } catch (error) {
    console.error('Toggle bookmark error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
