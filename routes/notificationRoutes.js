// ஃபைல்: server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// 1. நோட்டிபிகேஷனை சேவ் பண்ண (Employee கன்பார்ம் பண்ணும்போது)
router.post('/send', async (req, res) => {
    try {
        const newNotif = await Notification.create(req.body);
        res.status(201).json({ success: true, data: newNotif });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error sending notification" });
    }
});

// 2. ஒரு யூசரோட நோட்டிபிகேஷன்களை எடுக்க (Student லாகின் பண்ணும்போது பார்க்க)
router.get('/:userId', async (req, res) => {
    try {
        const notifs = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: notifs });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching notifications" });
    }
});

module.exports = router;