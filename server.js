require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Database Connection
connectDB();

const app = express();

// 🚀 Bulletproof CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    callback(null, true); // Allow anywhere
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// 🛡️ மிடில்வேர்ஸ் (Middlewares)
// 🛡️ மிடில்வேர்ஸ் (Middlewares)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 🛡️ Request Timeout Middleware: Closes hung connections so Hostinger process slots are never exhausted
app.use((req, res, next) => {
  res.setTimeout(10000, () => {
    if (!res.headersSent) {
      res.status(504).json({ success: false, message: 'Request Timeout' });
    }
  });
  next();
});

// 🛡️ Client Flood & Polling Loop Protection (Rate limiter: 120 req/min per IP)
const rateLimitMap = new Map();
app.use((req, res, next) => {
  if (req.path === '/api/health' || req.path === '/') return next();
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60000;
  const maxRequests = 120;

  let record = rateLimitMap.get(ip);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
  }

  if (rateLimitMap.size > 1000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now - val.startTime > windowMs) rateLimitMap.delete(key);
    }
  }

  if (record.count > maxRequests) {
    return res.status(429).json({ success: false, message: 'Too many requests. Please slow down.' });
  }

  next();
});

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
// 💼 Expense Routes
const expenseRoutes = require('./routes/expenseRoutes');

// Sales Module Routes
const itemRoutes = require('./routes/itemRoutes');
const salesLeadRoutes = require('./routes/salesLeadRoutes');
const bomRoutes = require('./routes/bomRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const adminQuotationRoutes = require('./routes/adminQuotationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const robotriqLeadRoutes = require('./routes/robotriqLeadRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const settingRoutes = require('./routes/settingRoutes');
const serviceRoutes = require('./routes/serviceRoutes');


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
// 💼 Expense API
app.use('/api/expenses', expenseRoutes);

// Sales Module Routes API
app.use('/api/items', itemRoutes);
app.use('/api/sales-leads', salesLeadRoutes);
app.use('/api/boms', bomRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/admin-quotations', adminQuotationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/robotriq-leads', robotriqLeadRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/services', serviceRoutes);


// ==========================================

app.get('/', (req, res) => res.send('🚀 Robotriq CRM Server is Running...'));
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// 🛡️ Global Error Handler - Prevents server crashes on unhandled errors from any route
app.use((err, req, res, next) => {
  console.error('🚨 Global Express Error Handler caught:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// 🛡️ Process-level safety against crashes
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
