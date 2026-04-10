const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User'); // ⭐ ஸ்டூடண்ட் ஸ்டேட்டஸை மாத்த இது தேவை

// 🚀 1. Student Book பண்ணும் API
router.post('/book', async (req, res) => {
    try {
        const newBooking = new Booking({
            ...req.body,
            status: 'Pending', 
            requestedAt: new Date()
        });
        await newBooking.save();
        res.status(201).json({ success: true, message: "Booking request sent!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error booking slot!" });
    }
});

// 🚀 2. Employee (Teacher) Pending புக்கிங்ஸை பார்க்க API
router.get('/teacher-pending/:teacherId', async (req, res) => {
    try {
        const bookings = await Booking.find({ 
            teacherId: req.params.teacherId,
            status: 'Pending' 
        }).sort({ requestedAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending bookings" });
    }
});

// 🚀 3. Employee (Teacher) எல்லா புக்கிங்ஸையும் பார்க்க API
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const bookings = await Booking.find({ 
            teacherId: req.params.teacherId,
            status: { $in: ['Confirmed', 'Completed'] } 
        }).sort({ date: 1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching bookings" });
    }
});

// 🚀 4. Teacher: Confirm Booking (ஸ்டூடண்ட் ஸ்டேட்டஸ் மாறும்)
router.put('/confirm/:bookingId', async (req, res) => {
    try {
        // 1. புக்கிங் ஸ்டேட்டஸை மாத்துறோம்
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { status: 'Confirmed', confirmedAt: new Date() },
            { new: true }
        );
        
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
        
        // 2. ⭐ ஸ்டூடண்ட்டோட மெயின் ஸ்டேட்டஸையும் 'Class Confirmed' என மாத்துறோம்
        await User.findByIdAndUpdate(booking.studentId, { studentStatus: 'Class Confirmed' });
        
        res.json({ success: true, message: "Student Confirmed Successfully! ✅", data: booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error confirming booking" });
    }
});

// 🚀 5. Teacher: Reject Booking
router.put('/reject/:bookingId', async (req, res) => {
    try {
        const booking = await Booking.findByIdAndUpdate(
            req.params.bookingId,
            { status: 'Rejected', rejectedAt: new Date() },
            { new: true }
        );
        
        if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
        
        res.json({ success: true, message: "Booking rejected!", data: booking });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: "Error rejecting booking" });
    }
});

// 🚀 6. Student: Get My Bookings
router.get('/my-bookings/:studentId', async (req, res) => {
    try {
        const bookings = await Booking.find({ studentId: req.params.studentId })
            .sort({ createdAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching bookings" });
    }
});

// 🚀 7. Get All Pending Bookings (Admin view)
router.get('/all-pending', async (req, res) => {
    try {
        const bookings = await Booking.find({ status: 'Pending' })
            .populate('studentId', 'fullName email')
            .populate('teacherId', 'fullName')
            .sort({ requestedAt: -1 });
        res.json({ success: true, data: bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching pending bookings" });
    }
});

module.exports = router;