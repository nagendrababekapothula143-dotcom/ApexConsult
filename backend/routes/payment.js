const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase');
const { protect, authorize } = require('../middleware/auth');

const TABLE_NAME = 'consulting_payments';
const USERS_TABLE = 'consulting_users';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

// Helper to get user details for population
const getUserDetails = async (userId) => {
  if (!userId) return null;
  try {
    const doc = await db.collection(USERS_TABLE).doc(userId).get();
    if (doc.exists) {
      const u = doc.data();
      return { _id: doc.id, name: u.name, email: u.email, apexId: u.apexId };
    }
  } catch (err) {
    console.error('Error fetching user details:', err);
  }
  return null;
};

// @desc    Create a new Razorpay payment order
// @route   POST /api/payments/create-order
// @access  Private/Admin
router.post('/create-order', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const { studentId, amount } = req.body;

    if (!studentId || !amount) {
      return res.status(400).json({ success: false, error: 'Student ID and amount are required' });
    }

    // Razorpay expects amount in paise (multiply by 100)
    const options = {
      amount: amount * 100,
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    const paymentId = uuidv4();
    const now = new Date().toISOString();
    const payment = {
      id: paymentId,
      _id: paymentId, // Keep _id for frontend compatibility
      studentId: studentId,
      amount: amount,
      status: 'pending',
      razorpayOrderId: order.id,
      razorpayPaymentId: null,
      createdBy: req.user.id,
      createdAt: now,
      completedAt: null
    };

    await db.collection(TABLE_NAME).doc(paymentId).set(payment);

    // Populate student object manually for frontend
    payment.student = await getUserDetails(studentId);

    res.status(201).json({
      success: true,
      data: payment,
      orderId: order.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Get payments for logged-in student
// @route   GET /api/payments/student
// @access  Private/Student
router.get('/student', protect, async (req, res) => {
  try {
    const snapshot = await db.collection(TABLE_NAME).where('studentId', '==', req.user.id).get();
    let payments = snapshot.docs.map(doc => doc.data());
    
    // Map id to _id for frontend compatibility
    payments = payments.map(p => {
      p._id = p.id;
      return p;
    });

    // Sort by createdAt descending
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Get all payments (Admin)
// @route   GET /api/payments
// @access  Private/Admin
router.get('/', protect, authorize('admin', 'recruiter'), async (req, res) => {
  try {
    const cacheKey = 'all_payments';
    const cache = require('../utils/cache');
    const cachedData = cache.get(cacheKey);

    if (cachedData) {
      return res.status(200).json({ success: true, data: cachedData, cached: true });
    }

    const snapshot = await db.collection(TABLE_NAME).get();
    let payments = snapshot.docs.map(doc => doc.data());

    // Populate student data
    payments = await Promise.all(payments.map(async (p) => {
      p.student = await getUserDetails(p.studentId);
      p._id = p.id; // Map id to _id for frontend mapping
      return p;
    }));

    // Sort by createdAt descending
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    cache.set(cacheKey, payments, 30); // Cache for 30 seconds

    res.status(200).json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

// @desc    Verify Razorpay payment signature
// @route   POST /api/payments/verify
// @access  Private
router.post('/verify', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder')
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      const scanRes = await db.collection(TABLE_NAME).where('razorpayOrderId', '==', razorpay_order_id).get();

      if (!scanRes.empty) {
        const paymentId = scanRes.docs[0].id;
        
        await db.collection(TABLE_NAME).doc(paymentId).update({
          status: 'completed',
          razorpayPaymentId: razorpay_payment_id,
          completedAt: new Date().toISOString()
        });

        res.status(200).json({ success: true, message: 'Payment verified successfully' });
      } else {
        res.status(404).json({ success: false, error: 'Payment record not found' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid signature sent!' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
});

module.exports = router;
