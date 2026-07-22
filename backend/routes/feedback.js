const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { protect, authorize } = require('../middleware/auth');
// @route   POST /api/feedback
// @access  Private (Students)
router.post('/', protect, async (req, res) => {
  try {
    const { message, category } = req.body;
    
    if (!message || !category) {
      return res.status(400).json({ success: false, message: 'Message and category are required' });
    }

    const feedback = {
      id: uuidv4(),
      studentId: req.user.id,
      studentName: req.user.name,
      message,
      category,
      createdAt: new Date().toISOString()
    };

    await db.collection('consulting_feedback').doc(feedback.id).set(feedback);

    res.status(201).json({ success: true, data: feedback });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @desc    Get all feedback
// @route   GET /api/feedback
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const snapshot = await db.collection('consulting_feedback').get();
    let items = snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
    
    // Sort by newest first
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
