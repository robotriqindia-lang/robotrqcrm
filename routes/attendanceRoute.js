const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// 🚀 1. IST நேரத்தை மட்டும் துல்லியமாக எடுக்க ஹெல்ப்பர்
const getIST = () => {
  const now = new Date();
  
  // இந்திய தேதி (DD/MM/YYYY)
  const dateIST = now.toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' });
  
  // இந்திய நேரம் (HH:MM AM/PM)
  const timeIST = now.toLocaleTimeString('en-US', { 
    timeZone: 'Asia/Kolkata', 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  }).toUpperCase();

  // கணக்கீட்டிற்காக மட்டும் தற்போதைய IST மணி மற்றும் நிமிடங்கள்
  const istDateObj = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const totalMinutes = (istDateObj.getHours() * 60) + istDateObj.getMinutes();

  return { dateIST, timeIST, totalMinutes };
};

// 🚀 2. "04:31 AM" போன்ற ஸ்ட்ரிங்கை நிமிடங்களாக மாற்றும் பக்கா லாஜிக்
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

// ---------------------------------------------------------

// 1. ADMIN LOGS
router.get('/logs', async (req, res) => {
  try {
    const logs = await Attendance.find().sort({ createdAt: -1 });
    const { dateIST: today, totalMinutes: currentMins } = getIST();
    const cutoff = 1260; // 9:00 PM (21 * 60)

    const updatedLogs = logs.map(log => {
      const l = log.toObject();
      if (!l.checkOut || l.checkOut === "") {
        if (l.date !== today || currentMins > cutoff) {
          l.status = 'Absent';
          l.checkOut = '--';
          l.duration = '0h 0m';
        } else {
          l.status = 'In Office';
        }
      }
      return l;
    });

    res.status(200).json({ success: true, data: updatedLogs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching logs!' });
  }
});

// 2. USER DASHBOARD LOGS
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

// 3. CHECK-IN (Fixed IST)
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

// 4. CHECK-OUT (The 4h/6h/9pm Rules)
router.post('/check-out', async (req, res) => {
  try {
    const { userId, workSummary } = req.body;
    const { dateIST: today, timeIST: outTimeStr, totalMinutes: outMins } = getIST();
    const cutoffMins = 1260; // 9:00 PM

    const lastLog = await Attendance.findOne({ 
      userId, 
      date: today, 
      checkOut: { $in: [null, ""] } 
    }).sort({ createdAt: -1 });

    if (!lastLog) return res.status(400).json({ success: false, message: "No active session!" });

    const inMins = parseTimeToMinutes(lastLog.checkIn);
    let diffMins = outMins - inMins;
    if (diffMins < 0) diffMins += 1440; 
    
    const diffHrs = diffMins / 60;

    // 🔥 THE RULES
    let finalStatus = "Absent";
    if (outMins > cutoffMins) {
      finalStatus = "Absent"; 
    } else if (diffHrs >= 6) {
      finalStatus = "Present";
    } else if (diffHrs >= 4) {
      finalStatus = "Halfday";
    } else {
      finalStatus = "Absent";
    }

    lastLog.checkOut = outTimeStr;
    lastLog.duration = `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
    lastLog.status = finalStatus;
    lastLog.workSummary = workSummary || "Completed Session";

    await lastLog.save();
    res.status(200).json({ success: true, message: `Status: ${finalStatus}`, time: outTimeStr });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 5. DELETE MULTIPLE
router.post('/delete-multiple', async (req, res) => {
  try {
    const { ids } = req.body;
    await Attendance.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ success: true, message: "Records deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete' });
  }
});

// 6. GET BY ID
router.get('/employee/:id', protect, async (req, res) => {
    try {
        const userId = req.params.id;
        const logs = await Attendance.find({ userId }).sort({ date: -1 });
        res.status(200).json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// 🚀 7. UPDATE STATUS (ADMIN OVERRIDE) - NEW API ADDED HERE
router.put('/status/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatedLog = await Attendance.findByIdAndUpdate(
      req.params.id, 
      { status: status }, 
      { new: true }
    );

    if (!updatedLog) {
      return res.status(404).json({ success: false, message: 'Record not found' });
    }

    res.status(200).json({ success: true, message: "Status updated successfully", data: updatedLog });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;