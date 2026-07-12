const express = require('express');
const crypto = require('crypto');
const { docClient } = require('../config/dynamodb');
const { ScanCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

// Seed initial tickets if database is empty
const seedTickets = async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: 'consulting_tickets'
    }));

    if (!result.Items || result.Items.length === 0) {
      const initial = [
        { id: crypto.randomUUID(), studentName: 'Jane Student', subject: 'Resume Format Guidance', category: 'Resume Prep', priority: 'Medium', status: 'Open', createdAt: new Date().toISOString() },
        { id: crypto.randomUUID(), studentName: 'David Kim', subject: 'Interview Schedule Conflict', category: 'Scheduling', priority: 'High', status: 'Resolved', createdAt: new Date().toISOString() },
        { id: crypto.randomUUID(), studentName: 'Charan Ambiripeta', subject: 'McKinsey Case Study Mock Request', category: 'Case Study', priority: 'High', status: 'Open', createdAt: new Date().toISOString() },
      ];

      for (const item of initial) {
        await docClient.send(new PutCommand({
          TableName: 'consulting_tickets',
          Item: item
        }));
      }
      console.log('Seed tickets inserted into DynamoDB successfully.');
    }
  } catch (err) {
    console.error('Error seeding tickets:', err.message);
  }
};

// Execute seeding after table check (delay slightly to let tables create if needed)
setTimeout(seedTickets, 2500);

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

// @desc    Get tickets for current student
// @route   GET /api/tickets/student
// @access  Private (Student)
router.get('/student', protect, async (req, res) => {
  try {
    const studentId = req.user.id || req.user._id;

    const command = new ScanCommand({
      TableName: 'consulting_tickets',
      FilterExpression: 'studentId = :studentId',
      ExpressionAttributeValues: {
        ':studentId': studentId
      }
    });

    const result = await docClient.send(command);

    const tickets = (result.Items || []).map(t => ({
      ...t,
      _id: t.id
    })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error('Fetch student tickets error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @desc    Resolve a ticket
// @route   PATCH /api/tickets/:id/resolve
// @access  Private (Admin only)
router.patch('/:id/resolve', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // We can use PutCommand to overwrite or UpdateCommand. We'll fetch then Put for simplicity in MVP.
    const getResult = await docClient.send(new ScanCommand({
      TableName: 'consulting_tickets',
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': id }
    }));

    if (!getResult.Items || getResult.Items.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = getResult.Items[0];
    ticket.status = 'Resolved';
    ticket.resolvedAt = new Date().toISOString();

    await docClient.send(new PutCommand({
      TableName: 'consulting_tickets',
      Item: ticket
    }));

    // Emit socket event to the student so their FloatingChat freezes in real-time
    const io = req.app.get('io');
    const connectedUsers = req.app.get('connectedUsers');
    if (io && connectedUsers) {
      const targetSocketId = connectedUsers.get(ticket.studentId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('ticketResolved', ticket);
      }
    }

    res.status(200).json({ success: true, data: { ...ticket, _id: ticket.id } });
  } catch (error) {
    console.error('Resolve ticket error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
