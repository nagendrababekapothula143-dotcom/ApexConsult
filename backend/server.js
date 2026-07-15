require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// --- ONE TIME SETUP BLOCK ---
try {
  const routesPath = path.join(__dirname, 'routes');
  if (fs.existsSync(path.join(routesPath, 'messages - Copy.js'))) {
    fs.unlinkSync(path.join(routesPath, 'messages - Copy.js'));
    console.log('Deleted messages - Copy.js');
  }
  if (fs.existsSync(path.join(routesPath, 'tickets - Copy.js'))) {
    fs.unlinkSync(path.join(routesPath, 'tickets - Copy.js'));
    console.log('Deleted tickets - Copy.js');
  }
  
  // Check if helmet is installed, if not, install dependencies
  try { require.resolve('helmet'); } catch(e) {
    console.log('Installing helmet...');
    execSync('npm install helmet', { stdio: 'inherit', cwd: __dirname });
  }

  try { require.resolve('express-rate-limit'); } catch(e) {
    console.log('Installing express-rate-limit...');
    execSync('npm install express-rate-limit', { stdio: 'inherit', cwd: __dirname });
  }

  try { require.resolve('node-cache'); } catch(e) {
    console.log('Installing node-cache...');
    execSync('npm install node-cache', { stdio: 'inherit', cwd: __dirname });
  }

  try { require.resolve('ip-address'); } catch(e) {
    console.log('Installing missing ip-address dependency directly...');
    execSync('npm install ip-address', { stdio: 'inherit', cwd: __dirname });
  }
} catch (e) {
  console.error('Setup block error:', e);
}
// ----------------------------

const compression = require('compression');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initDynamoDB } = require('./config/dynamodb');



const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*', // Allows all origins during development. Can restrict in prod.
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Inject io into Express app so routes can access it via req.app.get('io')
app.set('io', io);

// Store mapping of userId -> socketId
const connectedUsers = new Map();

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

// Standard Middlewares
app.use(helmet()); // Enforce security headers
app.use(cors());
app.use(compression()); // Compress all JSON responses
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
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
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/audit-logs', require('./routes/audit'));

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

const PORT = process.env.PORT || 5000;

initDynamoDB().then(() => {
  // IMPORTANT: Use server.listen instead of app.listen for Socket.io
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize AWS DynamoDB tables:', err);
  process.exit(1);
});
