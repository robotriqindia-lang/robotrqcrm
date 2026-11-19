const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Task = require('../models/Task');
const Leave = require('../models/Leave');
const Booking = require('../models/Booking');
const Expense = require('../models/Expense');
const Notification = require('../models/Notification');

// 🚀 In-memory cache to eliminate duplicate requests & multi-tab hammering
// Cache key: `emp_${employeeId}` -> { timestamp, data }
const summaryCache = new Map();
const CACHE_TTL_MS = 15000; // 15 seconds cache TTL

// Helper to get IST date string
const getTodayIST = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const dd = String(ist.getDate()).padStart(2, '0');
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const yyyy = ist.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ==========================================
// 🚀 COMBINED EMPLOYEE DASHBOARD SUMMARY
// Replaces 7 separate HTTP calls with 1 call!
// ==========================================
router.get('/employee-summary/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const now = Date.now();

  if (!employeeId) {
    return res.status(400).json({ success: false, message: 'Employee ID required' });
  }

  // 1. Check in-memory cache first
  const cached = summaryCache.get(employeeId);
  if (cached && (now - cached.timestamp < CACHE_TTL_MS)) {
    return res.status(200).json({ 
      success: true, 
      data: cached.data, 
      cached: true 
    });
  }

  try {
    const todayStr = getTodayIST();

    // 2. Query targeted data in parallel with sensible limits
    const [user, myLogs, tasks, myLeaves, bookings, expenses, notifications] = await Promise.all([
      User.findById(employeeId).select('-password').lean(),
      Attendance.find({ userId: employeeId }).sort({ createdAt: -1 }).limit(10).lean(),
      Task.find({ assignedTo: employeeId }).sort({ createdAt: -1 }).limit(30).lean(),
      Leave.find({ userId: employeeId }).sort({ createdAt: -1 }).limit(20).lean(),
      Booking.find({ teacherId: employeeId, status: 'Pending' }).sort({ requestedAt: -1 }).limit(20).lean(),
      Expense.find({ employeeId }).sort({ date: -1, createdAt: -1 }).limit(30).lean(),
      Notification.find({ userId: employeeId }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    let students = [];
    let studentTasks = [];

    // Only fetch student data if user is an admin
    if (user && user.role === 'admin') {
      const [studRes, allTasksRes] = await Promise.all([
        User.find({ role: 'student' }).select('-password').limit(100).lean(),
        Task.find({ role: 'student' }).sort({ createdAt: -1 }).limit(100).lean()
      ]);
      students = studRes || [];
      studentTasks = allTasksRes || [];
    }

    const cleanNotifs = (notifications || []).filter(n => {
      const title = (n.title || '').toLowerCase();
      return !title.includes('class confirmed') && !title.includes('declined');
    });

    const responseData = {
      user: user || null,
      attendanceLogs: myLogs || [],
      tasks: tasks || [],
      leaves: myLeaves || [],
      bookings: bookings || [],
      expenses: expenses || [],
      notifications: cleanNotifs,
      students,
      studentTasks
    };

    // 3. Save to cache
    summaryCache.set(employeeId, { timestamp: now, data: responseData });

    // Clean up cache if too large
    if (summaryCache.size > 200) {
      for (const [k, v] of summaryCache.entries()) {
        if (now - v.timestamp > CACHE_TTL_MS * 2) summaryCache.delete(k);
      }
    }

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error("Dashboard summary error:", error);
    return res.status(500).json({ success: false, message: "Error fetching dashboard summary" });
  }
});

module.exports = router;
