const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET setting by key
router.get('/:key', async (req, res) => {
    try {
        const setting = await Setting.findOne({ key: req.params.key });
        if (!setting) {
            return res.status(200).json({ success: true, data: null, message: 'Setting not found' });
        }
        res.status(200).json({ success: true, data: setting.value });
    } catch (err) {
        console.error('Error fetching setting:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST/PUT upsert setting by key
router.post('/:key', async (req, res) => {
    try {
        const { value } = req.body;
        if (value === undefined) {
            return res.status(400).json({ success: false, message: 'Value is required' });
        }

        const setting = await Setting.findOneAndUpdate(
            { key: req.params.key },
            { key: req.params.key, value },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, data: setting.value, message: 'Setting saved successfully' });
    } catch (err) {
        console.error('Error saving setting:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
