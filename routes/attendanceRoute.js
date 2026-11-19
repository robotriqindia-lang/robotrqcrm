const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// 1. IST Helper
const getIST = () => {
  const now = new Date();
  const dateIST = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  const timeIST = now.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).toUpperCase();
  const istDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const totalMinutes = (istDateObj.getHours() * 60) + istDateObj.getMinutes();
  return { dateIST, timeIST, totalMinutes };
};

const parseTimeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === "--") return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  let minutes = parseInt(match[2], 10);
  const modifier = match[3].toUpperCase();
  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;
  return (hours * 60) + minutes;
};

// ===============================
// 1. ADMIN LOGS (🔥 BULLETPROOF CLEAN LOGIC)
// ===============================
router.get('/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 1000;
    const logs = await Attendance.find().sort({ createdAt: -1 }).limit(limit);
    const { dateIST: today, totalMinutes: currentMins } = getIST();
    const cutoff = 1440;

    const updatedLogs = logs.map(log => {
      const l = log.toObject();

      // 🚀 THE ULTIMATE FIX: 
      // ரெக்கார்டு "In Office"-னு இருந்தா மட்டும் ஆட்டோ-ஆப்சென்ட் லாஜிக் ஓடட்டும்.
      // அட்மின் "Present" னோ "Half Day" னோ மாத்தியிருந்தா, இந்த சிஸ்டம் அதைத் தொடவே தொடாது!!
      if (l.status === 'In Office') {
        if (l.date !== today || currentMins >= cutoff) {
          l.status = 'Absent';
          l.checkOut = '--';
          l.duration = '0h 0m';
        }
      }

      // UI-ல் எரர் வராம இருக்க காலியா இருந்தா `--` போடுறோம்
      if (!l.checkOut || l.checkOut === "") l.checkOut = '--';
      if (!l.duration || l.duration === "") l.duration = '0h 0m';

      return l;
    });

    res.status(200).json({ success: true, data: updatedLogs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching logs!' });
  }
});

// ===============================
// 2. USER DASHBOARD LOGS
// ===============================
router.get('/logs/my/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { dateIST: today } = getIST();
    const logs = await Attendance.find({ userId, date: today }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 2b. GET ALL ATTENDANCE HISTORY FOR A SPECIFIC EMPLOYEE
router.get('/history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await Attendance.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ===============================
// 3. CHECK-IN
// ===============================
router.post('/check-in', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    const { dateIST: today, timeIST: nowTime } = getIST();

    const activeLog = await Attendance.findOne({ userId, date: today, checkOut: { $in: [null, ""] } });
    if (activeLog) return res.status(400).json({ success: false, message: "Already Checked-In!" });

    const newLog = new Attendance({
      userId,
      userName: user?.fullName || "User",
      role: user?.role || "employee",
      date: today,
      checkIn: nowTime,
      status: 'In Office'
    });

    await newLog.save();
    res.status(200).json({ success: true, message: "Check-In Successful!", time: nowTime });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ===============================
// 4. CHECK-OUT
// ===============================
router.post('/check-out', async (req, res) => {
  try {
    const { userId, workSummary } = req.body;
    const { dateIST: today, timeIST: outTimeStr, totalMinutes: outMins } = getIST();
    const cutoffMins = 1440;

    const lastLog = await Attendance.findOne({ 
      userId, date: today, checkOut: { $in: [null, "", "--"] } 
    }).sort({ createdAt: -1 });

    if (!lastLog) return res.status(400).json({ success: false, message: "No active session!" });

    const inMins = parseTimeToMinutes(lastLog.checkIn);
    let diffMins = outMins - inMins;
    if (diffMins < 0) diffMins += 1440;
    const diffHrs = diffMins / 60;

    let finalStatus = "Absent";
    if (outMins >= cutoffMins) finalStatus = "Absent";
    else if (diffHrs >= 6) finalStatus = "Present";
    else if (diffHrs >= 4) finalStatus = "Halfday";
    else finalStatus = "Absent";

    lastLog.checkOut = outTimeStr;
    lastLog.duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    lastLog.status = finalStatus;
    lastLog.workSummary = workSummary || "Completed Session";

    await lastLog.save();

    res.status(200).json({ success: true, message: `Status: ${finalStatus}`, time: outTimeStr });
  } catch (error) {
    console.error("Checkout Route Error:", error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ===============================
// 5. DELETE MULTIPLE
// ===============================
router.post('/delete-multiple', async (req, res) => {
  try {
    const { ids } = req.body;
    await Attendance.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ success: true, message: "Records deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

// ===============================
// 6. GET BY ID
// ===============================
router.get('/employee/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const logs = await Attendance.find({ userId }).sort({ date: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ===============================
// 7. UPDATE STATUS (🔥 SIMPLE & DIRECT)
// ===============================
router.put('/status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    // 🚀 எந்த ஹேக்கும் கிடையாது. நீங்க என்ன ஸ்டேட்டஸ் மாத்துறீங்களோ, அதை அப்படியே டேட்டாபேஸ்ல ஏத்துறோம்!
    const updatedLog = await Attendance.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );
    
    res.status(200).json({ success: true, message: "Status updated successfully", data: updatedLog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ===============================
// 8. FORGOT CHECKOUT REQUESTS
// ===============================
router.post('/forgot-checkout', async (req, res) => {
  try {
    const { userId, userName, date, reason } = req.body;
    const db = mongoose.connection;
    await db.collection('forgotcheckouts').insertOne({
      userId, userName, date, reason, createdAt: new Date()
    });
    res.status(200).json({ success: true, message: "Reason submitted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get('/forgot-requests', async (req, res) => {
  try {
    const db = mongoose.connection;
    const requests = await db.collection('forgotcheckouts').find({}).sort({ createdAt: -1 }).toArray();
    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.delete('/forgot-request/:id', async (req, res) => {
  try {
    const db = mongoose.connection;
    const requestId = new mongoose.Types.ObjectId(req.params.id);
    
    const request = await db.collection('forgotcheckouts').findOne({ _id: requestId });
    if (!request) return res.status(404).json({ success: false, message: "Request not found" });

    await db.collection('forgotcheckouts').deleteOne({ _id: requestId });

    // Notification Logic
    await db.collection('notifications').insertOne({
        userId: request.userId,
        type: 'checkout_accepted',
        title: 'Check-Out Accepted',
        message: `Your check-out request for ${request.date} has been accepted by Admin.`,
        read: false,
        createdAt: new Date()
    });

    res.status(200).json({ success: true, message: "Request accepted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;