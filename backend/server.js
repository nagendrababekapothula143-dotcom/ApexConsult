require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDynamoDB, docClient } = require('./config/dynamodb');
const { ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io initialization (Disabled in Serverless/Production)
let io;
const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';
if (!isServerless) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allows all origins during development. Can restrict in prod.
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });
}

// Store mapping of userId -> socketId
const connectedUsers = new Map();

if (!isServerless && io) {
  // Inject io into Express app so routes can access it via req.app.get('io')
  app.set('io', io);

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // User joins socket room
    socket.on('join', ({ userId, role }) => {
      connectedUsers.set(userId, socket.id);
      console.log(`User ${userId} (Role: ${role}) joined with socket ${socket.id}`);
      if (role === 'admin') {
        socket.join('admins');
      }
    });

    // Typing events
    socket.on('typing', ({ targetUserId, senderRole }) => {
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('typing', { senderRole });
      }
    });

    socket.on('stopTyping', ({ targetUserId, senderRole }) => {
      const targetSocketId = connectedUsers.get(targetUserId);
      if (targetSocketId) {
        io.to(targetSocketId).emit('stopTyping', { senderRole });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of connectedUsers.entries()) {
        if (socketId === socket.id) {
          connectedUsers.delete(userId);
          console.log(`User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  // Expose connectedUsers mapping if needed
  app.set('connectedUsers', connectedUsers);
}

// Trust proxy for rate limiter when hosted on platforms like Render/Heroku
app.set('trust proxy', 1);

// Standard Middlewares
app.use(helmet()); // Enforce security headers
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser requests
    
    // Always allow localhost and local network IP ranges for development
    if (
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:') ||
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.')
    ) {
      return callback(null, true);
    }
    
    // Exact production domains
    const allowedOrigins = [
      'https://apexconsult.onrender.com', 
      'https://apexconsulting-kohl.vercel.app',
      'https://apex-consult-nine.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    
    // Reject anything else
    return callback(new Error('CORS policy violation'), false);
  },
  credentials: true 
}));
app.use(cookieParser());
app.use(compression()); // Compress all JSON responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Feature 86: Rate Limiting Dashboard (Track violations)
const rateLimitViolations = [];
app.set('rateLimitViolations', rateLimitViolations);

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    let cleanIp = req.ip || req.connection.remoteAddress || 'Unknown IP';
    if (cleanIp.startsWith('::ffff:')) cleanIp = cleanIp.substring(7);
    
    // Add violation to memory array (keep last 50)
    rateLimitViolations.unshift({
      ip: cleanIp,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
    if (rateLimitViolations.length > 50) rateLimitViolations.pop();

    res.status(options.statusCode).send(options.message);
  }
});
app.use('/api/', globalLimiter);

// Serve static uploads folder (fallback for local file uploads) with cache headers
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/audit-logs', require('./routes/audit'));
app.use('/api/payments', require('./routes/payment'));
app.use('/api/system', require('./routes/system'));

// Basic Health Check Route
app.get('/', (req, res) => {
  res.json({ message: 'Consulting Portal API is running...' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: err.message || 'Server Error',
  });
});

// Feature 83: Data Retention Policies (Delete inactive users > 3 years old)
const setupDataRetentionJob = () => {
  const runRetentionPolicy = async () => {
    try {
      console.log('Running data retention policy check...');
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      const scanParams = {
        TableName: 'consulting_users',
        FilterExpression: 'lastLogin < :threeYearsAgo AND #role = :studentRole',
        ExpressionAttributeNames: { '#role': 'role' },
        ExpressionAttributeValues: { 
          ':threeYearsAgo': threeYearsAgo.toISOString(),
          ':studentRole': 'student'
        }
      };
      
      const data = await docClient.send(new ScanCommand(scanParams));
      
      if (data.Items && data.Items.length > 0) {
        console.log(`Found ${data.Items.length} inactive users for deletion.`);
        for (const user of data.Items) {
          await docClient.send(new DeleteCommand({
            TableName: 'consulting_users',
            Key: { id: user.id }
          }));
          console.log(`Deleted inactive user: ${user.id}`);
        }
      }
    } catch (err) {
      console.error('Data retention job failed:', err);
    }
  };

  // Run once immediately on startup, then every 24 hours (86400000 ms)
  runRetentionPolicy();
  setInterval(runRetentionPolicy, 86400000);
};

setupDataRetentionJob();

// Start Server
const PORT = process.env.PORT || 5000;

if (!isServerless) {
  try {
    require('child_process').execSync(`npx kill-port ${PORT}`, { stdio: 'ignore' });
  } catch (e) {}
}

initDynamoDB().then(() => {
  if (!isServerless) {
    // IMPORTANT: Use server.listen instead of app.listen for Socket.io
    server.listen(PORT, () => {
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } else {
    console.log(`Server running in Serverless mode on Vercel`);
  }
}).catch(err => {
  console.error('Failed to initialize AWS DynamoDB tables:', err);
  if (!isServerless) process.exit(1);
});

module.exports = app;
