const express = require('express');

const { db } = require('../config/firebase');
const { bucket } = require('../config/firebase');
const { deleteS3Object } = require('../config/s3');
const { protect, authorize } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { logAuditAction } = require('../utils/auditLogger');
const router = express.Router();

const generateToken = (id, sessionId) => {
  return jwt.sign({ id, sessionId }, process.env.JWT_SECRET || 'consulting_jwt_secret_key_987654321_abcdef', {
    expiresIn: '30d',
  });
};



// @desc    Stream an avatar image securely from S3
// @route   GET /api/auth/avatar/:key
// @access  Public
router.get('/avatar/:key', async (req, res) => {
  const key = req.params.key;
  if (!key) return res.status(400).send('No key provided');
  if (!bucket) return res.status(500).send('Storage not configured');

  try {
    const file = bucket.file(`avatars/${key}`);
    const [exists] = await file.exists();
    if (!exists) {
      return res.status(404).send('Avatar not found');
    }

    const [metadata] = await file.getMetadata();
    
    res.setHeader('Content-Type', metadata.contentType || 'image/png');
    if (metadata.size) {
      res.setHeader('Content-Length', metadata.size);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache 1 year
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow embedding from Vercel
    
    // Pipe the Storage stream directly to the Express response
    file.createReadStream().pipe(res);
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

    const existing = await db.collection('consulting_users').where('email', '==', formattedEmail).get();

    if (!existing.empty) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // 2. Create user with bcrypt
    const userId = crypto.randomUUID();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Create user in Firestore
    const apexId = 'KRY' + Math.floor(1000000 + Math.random() * 9000000);
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const newUser = {
      id: userId,
      apexId,
      name,
      email: formattedEmail,
      password: hashedPassword,
      role: 'recruiter',
      avatarUrl,
      createdAt: new Date().toISOString()
    };

    await db.collection('consulting_users').doc(newUser.id).set(newUser);

    res.status(201).json({
      success: true,
      token: generateToken(newUser.id),
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
    const recruitersSnapshot = await db.collection('consulting_users').where('role', '==', 'recruiter').get();
    
    const mappedRecruiters = [];
    recruitersSnapshot.forEach(doc => {
      const r = doc.data();
      mappedRecruiters.push({
        ...r,
        _id: r.id
      });
    });

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
    const userDoc = await db.collection('consulting_users').doc(userId).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const userData = userDoc.data();
    if (userData.role !== 'recruiter') {
      return res.status(403).json({ success: false, message: 'You can only delete recruiter accounts.' });
    }

    // 2. Delete from Firestore
    await db.collection('consulting_users').doc(userId).delete();

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

    // Check if user exists using Firestore
    const existing = await db.collection('consulting_users').where('email', '==', formattedEmail).get();

    if (!existing.empty) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const userId = crypto.randomUUID();
    const apexId = 'KRY' + Math.floor(1000000 + Math.random() * 9000000);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    let avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'User')}&background=random`;

    if (req.body.avatarBase64 && bucket) {
      try {
        const base64Data = req.body.avatarBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `avatars/${userId}-${Date.now()}.png`;

        await bucket.file(key).save(buffer, {
          metadata: { contentType: 'image/png' }
        });

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

    // Save to Firestore
    await db.collection('consulting_users').doc(newUser.id).set(newUser);

    usersCache.del('students');

    await logAuditAction(
      userId,
      newUser.name,
      'REGISTER_ACCOUNT',
      userId,
      { role: newUser.role, email: newUser.email }
    );

    const sessionId = crypto.randomUUID();
    const token = generateToken(userId, sessionId);
    
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(201).json({
      success: true,
      token,
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
    const existing = await db.collection('consulting_users').where('email', '==', formattedEmail).get();

    if (existing.empty) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = existing.docs[0].data();

    // Handle legacy users (from Firebase) who don't have a password
    if (!user.password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('password123', salt);
      
      // Update them in Firestore with the fallback password
      await db.collection('consulting_users').doc(user.id).update({ password: hashedPassword });

      return res.status(401).json({ success: false, message: 'Your account was migrated from our old system. Your temporary password is: password123. Please log in with that and change it immediately.' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Feature 87: Session Management
    const sessionId = crypto.randomUUID();
    
    let cleanIp = req.ip || req.connection.remoteAddress || 'Unknown IP';
    if (cleanIp.startsWith('::ffff:')) {
      cleanIp = cleanIp.substring(7);
    }
    if (cleanIp === '::1') {
      cleanIp = '127.0.0.1 (Localhost)';
    }

    const newSession = {
      sessionId,
      userAgent: req.headers['user-agent'] || 'Unknown Device',
      ip: cleanIp,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    };

    let updatedSessions = user.sessions || [];
    // Keep max 5 sessions per user to avoid DynamoDB document size limits
    updatedSessions.push(newSession);
    if (updatedSessions.length > 5) {
      updatedSessions = updatedSessions.slice(-5);
    }

    await db.collection('consulting_users').doc(user.id).update({
      sessions: updatedSessions
    });

    const token = generateToken(user.id, sessionId);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      token,
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

// @desc    Logout user & clear cookie
// @route   POST /api/auth/logout
// @access  Public
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
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
        ...user,
        _id: user.id
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

const NodeCache = require('node-cache');
const usersCache = new NodeCache({ stdTTL: 60, checkperiod: 120 }); // 60 seconds caching


// @desc    Get all students
// @route   GET /api/auth/students
// @access  Private (Admin & Recruiter)
router.get('/students', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    if (usersCache.has('students')) {
      return res.status(200).json(usersCache.get('students'));
    }

    const resultSnapshot = await db.collection('consulting_users').where('role', '==', 'student').get();

    const students = await Promise.all(resultSnapshot.docs.map(async (doc) => {
      const student = doc.data();
      let currentApexId = student.apexId;
      
      // Retroactively assign apexId to legacy students
      if (!currentApexId) {
        currentApexId = 'KRY' + Math.floor(1000000 + Math.random() * 9000000);
        try {
          await db.collection('consulting_users').doc(student.id).update({ apexId: currentApexId });
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

    const resultSnapshot = await db.collection('consulting_users').where('role', '==', 'recruiter').get();

    const recruiters = resultSnapshot.docs.map(doc => {
      const recruiter = doc.data();
      return {
        ...recruiter,
        _id: recruiter.id
      };
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
    // 1. Delete from Firestore
    await db.collection('consulting_users').doc(studentId).delete();

    // 3. Delete all applications & S3 resumes for this student
    const appsSnapshot = await db.collection('consulting_applications')
      .where('student', '==', studentId)
      .get();
      
    // (Also handle 'studentId' just in case)
    const appsSnapshot2 = await db.collection('consulting_applications')
      .where('studentId', '==', studentId)
      .get();

    const allApps = [...appsSnapshot.docs, ...appsSnapshot2.docs];
    // Deduplicate by ID
    const uniqueApps = Array.from(new Set(allApps.map(a => a.id)))
      .map(id => {
        return allApps.find(a => a.id === id);
      });

    if (uniqueApps.length > 0) {
      for (const doc of uniqueApps) {
        const app = doc.data();
        if (app.resumeKey) {
          await deleteS3Object(app.resumeKey);
        }
        await db.collection('consulting_applications').doc(app.id).delete();
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

    // const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
    
    // Get user from DB
    const resultDoc = await db.collection('consulting_users').doc(userId).get();
    const result = { Item: resultDoc.exists ? resultDoc.data() : null };

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

    // Update Firestore
    await db.collection('consulting_users').doc(userId).update({
      password: hashedNewPassword
    });

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
    
    await db.collection('consulting_users').doc(studentId).update({
      status: status || 'active'
    });

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

    // const { UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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
      'name', 'email', 'phone', 'university', 'major', 'location', 
      'linkedinUrl', 'portfolioUrl', 'education', 'experience', 
      'projects', 'technicalSkills', 'softSkills', 'certifications',
      'avatarUrl'
    ];

    if (req.body.avatarBase64 && bucket) {
      try {
        const base64Data = req.body.avatarBase64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const key = `avatars/${userIdToUpdate}-${Date.now()}.png`;

        await bucket.file(key).save(buffer, {
          metadata: { contentType: 'image/png' }
        });

        req.body.avatarUrl = `S3_KEY:${key.replace('avatars/', '')}`;
      } catch (uploadError) {
        console.error('Failed to upload custom avatar during profile update:', uploadError);
      }
    }

    const firestoreUpdate = {};
    let hasUpdates = false;

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        const cleaned = cleanEmptyStrings(req.body[field]);
        if (cleaned === undefined) {
          firestoreUpdate[field] = require('firebase-admin').firestore.FieldValue.delete();
        } else {
          firestoreUpdate[field] = cleaned;
        }
        hasUpdates = true;
      }
    });

    if (!hasUpdates) {
      return res.status(400).json({ success: false, message: 'No fields provided for update' });
    }

    await db.collection('consulting_users').doc(userIdToUpdate).update(firestoreUpdate);
    const resultDoc = await db.collection('consulting_users').doc(userIdToUpdate).get();
    const result = { Attributes: resultDoc.exists ? resultDoc.data() : null };

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

    await db.collection('consulting_users').doc(userIdToUpdate).update({
      role: role
    });

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
    const userDoc = await db.collection('consulting_users').doc(userId).get();
    const userRes = { Item: userDoc.exists ? userDoc.data() : null };

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

    await db.collection('consulting_users').doc(userId).update({
      bookmarkedJobs: newBookmarks
    });

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

// @desc    Get active sessions for current user
// @route   GET /api/auth/sessions
// @access  Private
router.get('/sessions', protect, async (req, res) => {
  try {
    const sessions = req.user.sessions || [];
    res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @desc    Revoke a specific session
// @route   DELETE /api/auth/sessions/:sessionId
// @access  Private
router.delete('/sessions/:sessionId', protect, async (req, res) => {
  try {
    const { sessionId } = req.params;
    let sessions = req.user.sessions || [];
    
    const filteredSessions = sessions.filter(s => s.sessionId !== sessionId);
    
    if (sessions.length === filteredSessions.length) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    await db.collection('consulting_users').doc(req.user.id).update({
      sessions: filteredSessions
    });

    const { logAuditAction } = require('../utils/auditLogger');
    await logAuditAction(req.user.id, req.user.name, 'REVOKE_SESSION', 'Revoked a session', { revokedSessionId: sessionId });

    res.status(200).json({ success: true, message: 'Session revoked successfully' });
  } catch (error) {
    console.error('Revoke session error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
