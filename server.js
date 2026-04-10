require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Database Connection
connectDB();

const app = express();

// 🚀 Bulletproof CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://localhost:5174', // 🚀 FIX: Port 5174 added here!
    'https://crm.robotriq.in',
    'https://robotriq-crm1.netlify.app'
  ], 
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 🛡️ மிடில்வேர்ஸ் (Middlewares)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 🚀 ROUTE IMPORTS 
// ==========================================
const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoute'); 
const leaveRoutes = require('./routes/leaveRoute');
const taskRoutes = require('./routes/taskRoute'); 
const transactionRoutes = require('./routes/transactionRoutes');
const bookingRoutes = require('./routes/bookingRoutes'); 
const scheduleRoutes = require('./routes/scheduleRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes'); 

// ⭐ Leads Routes ⭐
const leadRoutes = require('./routes/leadRoutes'); 
// 🔥 Reminders Route - NEW
const reminderRoutes = require('./routes/reminders');


// ==========================================
// 🚀 API ENDPOINTS (app.use)
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes); 
app.use('/api/leave', leaveRoutes);
app.use('/api/task', taskRoutes);
app.use('/api/accounts', transactionRoutes); 
app.use('/api/bookings', bookingRoutes); 
app.use('/api/schedule', scheduleRoutes); 
app.use('/api/notifications', notificationRoutes); 

// ⭐ Leads API ⭐
app.use('/api/leads', leadRoutes); 
// 🔥 Reminders API - NEW
app.use('/api/reminders', reminderRoutes);

// ==========================================

app.get('/', (req, res) => res.send('🚀 Robotriq CRM Server is Running...'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));