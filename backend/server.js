require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Make io accessible to routes
app.set('io', io);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ Created uploads directory');
}

// Test database connection
const db = require('./config/database');
db.testConnection().then(success => {
  if (!success) {
    console.log('⚠️  Database connection failed, but starting server anyway...');
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/worker', require('./routes/worker'));
app.use('/api/iot', require('./routes/iot'));
app.use('/api/ml', require('./routes/ml-verification'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'GreenEye API is running!',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Socket.io for real-time communication
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Admin joins admin room
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log('👨‍💼 Admin joined admin room:', socket.id);
  });
  
  // Worker joins specific room
  socket.on('join-worker-room', (workerId) => {
    socket.join(`worker-${workerId}`);
    console.log(`👷 Worker ${workerId} joined room`);
  });

  // Handle IoT connections
  socket.on('join-iot-room', () => {
    socket.join('iot-room');
    console.log('🏭 IoT device connected:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🚨 Error:', error);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error' 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 GreenEye Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔌 Socket.io running on port ${PORT}`);
  console.log(`📁 Uploads directory: ${uploadsDir}`);
});