const express = require('express');
const crypto = require('crypto');
const { docClient } = require('../config/dynamodb');
const { ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();



// @desc    Get all tickets
// @route   GET /api/tickets
// @access  Private (Admin only)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_tickets'
    }));

    const tickets = (result.Items || []).map(t => ({
      ...t,
      _id: t.id // frontend compatibility
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error('Fetch tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a new ticket
// @route   POST /api/tickets
// @access  Private (Admin only)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { studentName, subject, category, priority } = req.body;

  if (!studentName || !subject || !category) {
    return res.status(400).json({ success: false, message: 'Please fill in studentName, subject, and category' });
  }

  try {
    const newId = crypto.randomUUID();
    const newTicket = {
      id: newId,
      studentName,
      subject,
      category,
      priority: priority || 'Medium',
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_tickets',
      Item: newTicket
    }));

    const responseTicket = {
      ...newTicket,
      _id: newId
    };

    res.status(201).json({ success: true, data: responseTicket });
  } catch (error) {
    console.error('Create ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Get active ticket for student
// @route   GET /api/tickets/student/active
// @access  Private (Student)
router.get('/student/active', protect, async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;
    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_tickets'
    }));

    // Find the latest open ticket for this student
    const studentTickets = (result.Items || []).filter(t => t.studentId === studentId && t.status === 'Open');
    
    // Sort by createdAt descending (newest first)
    studentTickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const activeTicket = studentTickets[0] || null;

    res.status(200).json({ success: true, data: activeTicket ? { ...activeTicket, _id: activeTicket.id } : null });
  } catch (error) {
    console.error('Fetch active ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Create a new ticket (by Student)
// @route   POST /api/tickets/student
// @access  Private (Student)
router.post('/student', protect, async (req, res) => {
  const { subject, category } = req.body;
  const studentId = req.user.id || req.user._id;

  try {
    const newId = crypto.randomUUID();
    const newTicket = {
      id: newId,
      studentId: studentId,
      studentName: req.user.name,
      subject: subject || 'Support Request',
      category: category || 'General Support',
      priority: 'Medium',
      status: 'Open',
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: 'consulting_tickets',
      Item: newTicket
    }));

    res.status(201).json({ success: true, data: { ...newTicket, _id: newId } });
  } catch (error) {
    console.error('Create student ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Resolve a ticket
// @route   PATCH /api/tickets/:id/resolve
// @access  Private (Admin only)
router.patch('/:id/resolve', protect, authorize('admin'), async (req, res) => {
  try {
    const ticketId = req.params.id;

    // We need to get the ticket first to update it
    const scanResult = await docClient.send(new ScanCommand({
      TableName: 'consulting_tickets'
    }));
    
    const ticket = (scanResult.Items || []).find(t => t.id === ticketId);
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    ticket.status = 'Resolved';

    await docClient.send(new PutCommand({
      TableName: 'consulting_tickets',
      Item: ticket
    }));

    // Emit socket event to the student so their UI closes
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers && ticket.studentId) {
      const studentSocketId = connectedUsers.get(ticket.studentId);
      if (studentSocketId) {
        io.to(studentSocketId).emit('ticketResolved', { ticketId });
      }
    }

    res.status(200).json({ success: true, data: { ...ticket, _id: ticket.id } });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
