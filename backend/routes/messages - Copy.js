const express = require('express');
const crypto = require('crypto');
const { docClient } = require('../config/dynamodb');
const { QueryCommand, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// WebSockets natively handle typing indicators now.

// @desc    Get all messages for current student
// @route   GET /api/messages
// @access  Private (Student)
router.get('/', protect, async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const command = new QueryCommand({
      TableName: 'consulting_messages',
      IndexName: 'student-index',
      KeyConditionExpression: 'studentId = :studentId',
      ExpressionAttributeValues: {
        ':studentId': studentId
      }
    });

    const response = await docClient.send(command);
    
    // Sort by createdAt ascending
    const messages = (response.Items || []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json({ success: true, count: messages.length, data: messages });
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Send a message
// @route   POST /api/messages
// @access  Private (Student or Admin)
router.post('/', protect, async (req, res) => {
  try {
    const { text, targetStudentId } = req.body;
    
    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Message text is required' });
    }

    const senderId = req.user.id || req.user._id;
    const role = req.user.role;
    
    // If admin is sending, they must provide targetStudentId. If student, it's their own ID.
    const studentId = role === 'admin' ? targetStudentId : senderId;

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID is required for admins to send a message' });
    }

    // Find or create an open ticket for this student
    const ticketCommand = new ScanCommand({
      TableName: 'consulting_tickets',
      FilterExpression: 'studentId = :studentId AND #status = :status',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':studentId': studentId,
        ':status': 'Open'
      }
    });
    const ticketResult = await docClient.send(ticketCommand);
    let ticketId;
    
    if (ticketResult.Items && ticketResult.Items.length > 0) {
      ticketId = ticketResult.Items[0].id;
    } else {
      ticketId = crypto.randomUUID();
      const newTicket = {
        id: ticketId,
        studentId: studentId,
        studentName: role === 'student' ? req.user.name : 'Unknown Student', // Can be updated if needed
        subject: 'Support Request',
        category: 'General',
        priority: 'Medium',
        status: 'Open',
        createdAt: new Date().toISOString()
      };
      await docClient.send(new PutCommand({
        TableName: 'consulting_tickets',
        Item: newTicket
      }));
    }

    const newMessageId = crypto.randomUUID();
    const newMessage = {
      id: newMessageId,
      studentId: studentId,
      ticketId: ticketId,
      senderId: senderId,
      senderRole: role,
      senderName: req.user.name,
      text: text.trim(),
      createdAt: new Date().toISOString(),
      isRead: false
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_messages',
      Item: newMessage
    }));

    // Emit Socket.io event
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    
    console.log(`Sending message. Role: ${role}, targetStudentId: ${studentId}`);
    console.log(`Connected users count: ${connectedUsers.size}`);

    if (role === 'admin') {
      // Admin sending to student -> emit to that student's socket
      const targetSocketId = connectedUsers.get(studentId);
      console.log(`targetSocketId for ${studentId}: ${targetSocketId}`);
      if (targetSocketId) {
        io.to(targetSocketId).emit('newMessage', newMessage);
        console.log(`Message emitted to socket ${targetSocketId}`);
      }
    } else {
      // Student sending -> broadcast to all connected admins
      io.to('admins').emit('newMessage', newMessage);
      console.log(`Message broadcasted to admins room`);
    }

    res.status(201).json({ success: true, data: newMessage });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get all messages for admin
// @route   GET /api/messages/admin
// @access  Private (Admin)
router.get('/admin', protect, authorize('admin'), async (req, res) => {
  try {
    const { studentId } = req.query;

    let items = [];

    if (studentId) {
      // Query specific student messages
      const command = new QueryCommand({
        TableName: 'consulting_messages',
        IndexName: 'student-index',
        KeyConditionExpression: 'studentId = :studentId',
        ExpressionAttributeValues: {
          ':studentId': studentId
        }
      });
      const response = await docClient.send(command);
      items = response.Items || [];
    } else {
      // Scan all messages (in a production app, you'd maintain a separate "chats" table, but scan is fine for MVP)
      const command = new ScanCommand({
        TableName: 'consulting_messages'
      });
      const response = await docClient.send(command);
      items = response.Items || [];
    }

    // Sort ascending
    items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.status(200).json({ 
      success: true, 
      count: items.length, 
      data: items
    });
  } catch (error) {
    console.error('Admin fetch messages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get unread status for student
// @route   GET /api/messages/unread
// @access  Private (Student)
router.get('/unread', protect, async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const command = new QueryCommand({
      TableName: 'consulting_messages',
      IndexName: 'student-index',
      KeyConditionExpression: 'studentId = :studentId',
      FilterExpression: 'isRead = :isRead AND senderRole = :adminRole',
      ExpressionAttributeValues: {
        ':studentId': studentId,
        ':isRead': false,
        ':adminRole': 'admin'
      }
    });

    const response = await docClient.send(command);
    res.status(200).json({ success: true, count: response.Items?.length || 0, hasUnread: (response.Items?.length || 0) > 0 });
  } catch (error) {
    console.error('Fetch student unread error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get unread status for admin
// @route   GET /api/messages/admin/unread
// @access  Private (Admin)
router.get('/admin/unread', protect, authorize('admin'), async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: 'consulting_messages',
      FilterExpression: 'isRead = :isRead AND senderRole = :studentRole',
      ExpressionAttributeValues: {
        ':isRead': false,
        ':studentRole': 'student'
      }
    });

    const response = await docClient.send(command);
    res.status(200).json({ success: true, count: response.Items?.length || 0, hasUnread: (response.Items?.length || 0) > 0 });
  } catch (error) {
    console.error('Fetch admin unread error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Mark messages as read
// @route   PATCH /api/messages/mark-read
// @access  Private
router.patch('/mark-read', protect, async (req, res) => {
  try {
    const { targetStudentId } = req.body;
    const role = req.user.role;
    const studentId = role === 'admin' ? targetStudentId : (req.user.id || req.user._id);

    if (!studentId) {
      return res.status(400).json({ success: false, message: 'Student ID required' });
    }

    // Find all unread messages for this student
    // If admin is calling this, mark student messages as read. If student is calling, mark admin messages as read.
    const targetRoleToMark = role === 'admin' ? 'student' : 'admin';

    const command = new QueryCommand({
      TableName: 'consulting_messages',
      IndexName: 'student-index',
      KeyConditionExpression: 'studentId = :studentId',
      FilterExpression: 'isRead = :isRead AND senderRole = :targetRole',
      ExpressionAttributeValues: {
        ':studentId': studentId,
        ':isRead': false,
        ':targetRole': targetRoleToMark
      }
    });

    const response = await docClient.send(command);
    const unreadMessages = response.Items || [];

    // Update each unread message
    for (const msg of unreadMessages) {
      msg.isRead = true;
      await docClient.send(new PutCommand({
        TableName: 'consulting_messages',
        Item: msg
      }));
    }

    res.status(200).json({ success: true, message: `Marked ${unreadMessages.length} messages as read` });
  } catch (error) {
    console.error('Mark read error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;
