const express = require('express');

const { docClient } = require('../config/dynamodb');
const { QueryCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const { auth } = require('../config/firebase');
const router = express.Router();



// @desc    Register a new user (sync from Firebase)
// @route   POST /api/auth/register
// @access  Private (Needs Firebase Token)
router.post('/register', protect, async (req, res) => {
  const { name, email, role } = req.body;
  const firebaseUserId = req.user.id; // from protect middleware

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
      // If they already exist, just return them (maybe they are trying to register again or syncing)
      const existingUser = existing.Items[0];
      return res.status(200).json({
        success: true,
        data: {
          _id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
        },
      });
    }

    const apexId = 'APX' + Math.floor(1000000 + Math.random() * 9000000);

    const newUser = {
      id: firebaseUserId, // Use Firebase UID as the primary key
      apexId,
      name: name || 'User',
      email: formattedEmail,
      role: role || 'student',
      createdAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: 'consulting_users',
      Item: newUser
    }));

    // Invalidate users cache if they are syncing for the first time
    if (role === 'admin') {
      usersCache.admins.data = null;
    } else {
      usersCache.students.data = null;
    }

    res.status(201).json({
      success: true,
      data: {
        _id: firebaseUserId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Authenticate user & get token (sync from Firebase)
// @route   POST /api/auth/login
// @access  Private (Needs Firebase Token)
router.post('/login', protect, async (req, res) => {
  try {
    // protect middleware already checks if they exist in DynamoDB and adds to req.user
    if (!req.user || !req.user.role) {
       return res.status(404).json({ success: false, message: 'User record not found in database. Please register.' });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
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

// Simple memory cache for users
const usersCache = {
  students: { data: null, lastFetch: null },
  admins: { data: null, lastFetch: null },
  ttl: 60000 // 1 minute cache
};

// @desc    Get all students
// @route   GET /api/auth/students
// @access  Private (Admin only)
router.get('/students', protect, authorize('admin'), async (req, res) => {
  try {
    if (usersCache.students.data && (Date.now() - usersCache.students.lastFetch < usersCache.ttl)) {
      return res.status(200).json(usersCache.students.data);
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
    usersCache.students.data = responseData;
    usersCache.students.lastFetch = Date.now();

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch students error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all admins
// @route   GET /api/auth/admins
// @access  Private (Admin only)
router.get('/admins', protect, authorize('admin'), async (req, res) => {
  try {
    if (usersCache.admins.data && (Date.now() - usersCache.admins.lastFetch < usersCache.ttl)) {
      return res.status(200).json(usersCache.admins.data);
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
    usersCache.admins.data = responseData;
    usersCache.admins.lastFetch = Date.now();

    res.status(200).json(responseData);
  } catch (error) {
    console.error('Fetch admins error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Delete a student
// @route   DELETE /api/auth/students/:id
// @access  Private (Admin only)
router.delete('/students/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const studentId = req.params.id;
    
    const { DeleteCommand } = require('@aws-sdk/lib-dynamodb');
    
    // 1. Delete from Firebase Auth
    try {
      await auth.deleteUser(studentId);
    } catch (firebaseErr) {
      console.error('Firebase user deletion error (might not exist):', firebaseErr.message);
    }

    // 2. Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: 'consulting_users',
      Key: { id: studentId }
    }));

    // Clear cache
    usersCache.students.data = null;

    res.status(200).json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Delete student error:', error);
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
    usersCache.students.data = null;

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
    const { name, phone, university, major } = req.body;

    // Check permissions: Must be the user themselves OR an admin
    const requesterId = req.user.id || req.user._id;
    const requesterRole = req.user.role;

    if (requesterId !== userIdToUpdate && requesterRole !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this profile' });
    }

    const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
    // Build update expression dynamically based on provided fields
    let updateExpr = 'set ';
    let exprAttrNames = {};
    let exprAttrVals = {};
    let updates = [];

    if (name !== undefined) {
      updates.push('#name = :name');
      exprAttrNames['#name'] = 'name';
      exprAttrVals[':name'] = name === '' ? null : name;
    }
    if (phone !== undefined) {
      updates.push('#phone = :phone');
      exprAttrNames['#phone'] = 'phone';
      exprAttrVals[':phone'] = phone === '' ? null : phone;
    }
    if (university !== undefined) {
      updates.push('#university = :university');
      exprAttrNames['#university'] = 'university';
      exprAttrVals[':university'] = university === '' ? null : university;
    }
    if (major !== undefined) {
      updates.push('#major = :major');
      exprAttrNames['#major'] = 'major';
      exprAttrVals[':major'] = major === '' ? null : major;
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }

    updateExpr += updates.join(', ');

    const result = await docClient.send(new UpdateCommand({
      TableName: 'consulting_users',
      Key: { id: userIdToUpdate },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrVals,
      ReturnValues: 'ALL_NEW'
    }));

    // Clear caches
    usersCache.students.data = null;
    usersCache.admins.data = null;

    res.status(200).json({ success: true, message: 'Profile updated successfully', data: result.Attributes });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
