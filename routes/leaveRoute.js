const express = require('express');
const router = express.Router();
const Leave = require('../models/Leave');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// 1. Submit Leave Request
router.post('/request', protect, async (req, res) => {
  try {
    const { fromDate, toDate, reason } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const newLeave = new Leave({
      userId,
      userName: user.fullName,
      role: user.role,
      fromDate,
      toDate,
      reason,
      status: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await newLeave.save();
    res.status(200).json({ 
      success: true, 
      message: "Leave Request Submitted Successfully! ✅",
      data: newLeave 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// =======================================================
// 🗑️ புதுசு: 2. Clear All Leave Requests (Admin மட்டும்)
// ⚠️ முக்கியம்: இது /:id ரூட்டுக்கு மேலே இருக்க வேண்டும்!
// =======================================================
router.delete('/clear/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }
    await Leave.deleteMany({}); 
    res.status(200).json({ success: true, message: "All leave records cleared successfully! 🗑️" });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to clear leaves' });
  }
});

// 3. Get All Leave Requests (Admin)
router.get('/all', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }
    const leaves = await Leave.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 4. Get My Leave Requests (Employee/Student)
router.get('/my-leaves', protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// 5. Update Leave Status (Admin Approve/Reject)
router.put('/status-update/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }

    const { status } = req.body;
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!leave) return res.status(404).json({ success: false, message: 'Leave not found' });

    res.status(200).json({ 
      success: true, 
      message: `Leave ${status} Successfully!`,
      data: leave 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// =======================================================
// 🗑️ புதுசு: 6. Delete Single Leave Request (Admin மட்டும்)
// =======================================================
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access Denied' });
    }
    const leave = await Leave.findByIdAndDelete(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave record not found' });
    
    res.status(200).json({ success: true, message: 'Leave record deleted! 🗑️' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error deleting leave' });
  }
});

// 7. Get Leaves by Employee/Student ID
router.get('/employee/:id', protect, async (req, res) => {
  try {
    const leaves = await Leave.find({ userId: req.params.id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leaves });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching leaves!' });
  }
});

module.exports = router;