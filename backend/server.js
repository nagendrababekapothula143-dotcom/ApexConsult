require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

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

// Trust proxy for rate limiter when hosted on platforms like Render/Heroku
app.set('trust proxy', 1);

// Standard Middlewares
app.use(helmet()); // Enforce security headers
app.use(cors({
  origin: ['http://localhost:5173', 'https://apexconsult.onrender.com', 'https://apexconsulting-kohl.vercel.app'], 
  credentials: true 
}));
app.use(cookieParser());
app.use(compression()); // Compress all JSON responses
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // Limit each IP to 10000 requests per windowMs
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

try {
  require('child_process').execSync(`npx kill-port ${PORT}`, { stdio: 'ignore' });
} catch (e) {}

initDynamoDB().then(() => {
  // IMPORTANT: Use server.listen instead of app.listen for Socket.io
  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize AWS DynamoDB tables:', err);
  process.exit(1);
});
