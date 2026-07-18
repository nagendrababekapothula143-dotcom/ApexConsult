const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { protect, authorize } = require('../middleware/auth');

// Initialize AWS DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: true }
});

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
    const res = await docClient.send(new QueryCommand({
      TableName: USERS_TABLE,
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': userId }
    }));
    if (res.Items && res.Items.length > 0) {
      const u = res.Items[0];
      return { _id: u.id, name: u.name, email: u.email, apexId: u.apexId };
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

    // Razorpay expects amount in cents for USD (multiply by 100)
    const options = {
      amount: amount * 100,
      currency: 'USD',
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

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: payment
    }));

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
    const response = await docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'student-index',
      KeyConditionExpression: 'studentId = :sid',
      ExpressionAttributeValues: {
        ':sid': req.user.id
      }
    }));

    let payments = response.Items || [];
    
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
    const response = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME
    }));

    let payments = response.Items || [];

    // Populate student data
    payments = await Promise.all(payments.map(async (p) => {
      p.student = await getUserDetails(p.studentId);
      p._id = p.id; // Map id to _id for frontend mapping
      return p;
    }));

    // Sort by createdAt descending
    payments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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
      // Find the payment by order id. Scan is okay since order id is unique, but could be optimized.
      const scanRes = await docClient.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'razorpayOrderId = :rid',
        ExpressionAttributeValues: { ':rid': razorpay_order_id }
      }));

      if (scanRes.Items && scanRes.Items.length > 0) {
        const paymentId = scanRes.Items[0].id;
        
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { id: paymentId },
          UpdateExpression: 'set #status = :s, razorpayPaymentId = :rpi, completedAt = :ca',
          ExpressionAttributeNames: {
            '#status': 'status'
          },
          ExpressionAttributeValues: {
            ':s': 'completed',
            ':rpi': razorpay_payment_id,
            ':ca': new Date().toISOString()
          }
        }));

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
