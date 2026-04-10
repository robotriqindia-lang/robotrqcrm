const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');

// 🚀 Save or Update Schedule
router.post('/save', async (req, res) => {
    try {
        console.log("📥 Received Schedule Data:", req.body); 

        // Frontend-ல இருந்து வர்ற டேட்டா (groupName, courseName)
        const { groupName, courseName, weeklySchedule } = req.body;

        if (!groupName || typeof groupName !== 'string' || groupName.trim() === '') {
            return res.status(400).json({ success: false, message: "Valid groupName is required!" });
        }

        const cleanGroupName = groupName.trim();
        const cleanCourseName = courseName ? courseName.trim() : cleanGroupName;

        // ⭐ Mongoose Schema-வில் 'group' மற்றும் 'course' என்று இருப்பதால் அதையே பயன்படுத்துகிறோம்
        let schedule = await Schedule.findOne({ group: cleanGroupName });

        if (schedule) {
            // ஏற்கனவே இருந்தால் அப்டேட் செய்கிறோம்
            schedule.course = cleanCourseName; // courseName அல்ல, course!
            schedule.weeklySchedule = weeklySchedule || [];
            await schedule.save();
        } else {
            // புதிதாக உருவாக்குகிறோம்
            schedule = new Schedule({
                group: cleanGroupName,     // groupName அல்ல, group!
                course: cleanCourseName,   // courseName அல்ல, course!
                weeklySchedule: weeklySchedule || []
            });
            await schedule.save();
        }

        res.json({ success: true, message: "Schedule Saved successfully!", data: schedule });
    } catch (error) {
        console.error("🔥 Schedule Save Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
});

// 🚀 Get Schedule
router.get('/:groupName', async (req, res) => {
    try {
        const { groupName } = req.params;
        if (!groupName || groupName === 'null') return res.status(400).json({ success: false });

        // ⭐ தேடும்போதும் 'group' ஃபீல்டை வைத்து தேட வேண்டும்
        const schedule = await Schedule.findOne({ group: decodeURIComponent(groupName).trim() });
        res.json({ success: true, data: schedule });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const schedules = await Schedule.find();
        res.json({ success: true, data: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;