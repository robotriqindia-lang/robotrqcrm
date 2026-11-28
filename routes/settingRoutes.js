const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');

// GET all Security PINs
router.get('/pins/all', async (req, res) => {
    try {
        const [settingsPinDoc, amountEyePinDoc] = await Promise.all([
            Setting.findOne({ key: 'settings_pin' }),
            Setting.findOne({ key: 'amount_eye_pin' })
        ]);

        res.status(200).json({
            success: true,
            data: {
                settingsPin: settingsPinDoc ? String(settingsPinDoc.value) : '1990',
                amountEyePin: amountEyePinDoc ? String(amountEyePinDoc.value) : '1990'
            }
        });
    } catch (err) {
        console.error('Error fetching PIN settings:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST update Security PINs
router.post('/pins/update', async (req, res) => {
    try {
        const { settingsPin, amountEyePin } = req.body;
        const updates = [];

        if (settingsPin !== undefined && String(settingsPin).trim()) {
            updates.push(
                Setting.findOneAndUpdate(
                    { key: 'settings_pin' },
                    { key: 'settings_pin', value: String(settingsPin).trim() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                )
            );
        }

        if (amountEyePin !== undefined && String(amountEyePin).trim()) {
            updates.push(
                Setting.findOneAndUpdate(
                    { key: 'amount_eye_pin' },
                    { key: 'amount_eye_pin', value: String(amountEyePin).trim() },
                    { upsert: true, new: true, setDefaultsOnInsert: true }
                )
            );
        }

        await Promise.all(updates);

        res.status(200).json({
            success: true,
            message: 'Security PINs updated successfully',
            data: {
                settingsPin: settingsPin ? String(settingsPin).trim() : undefined,
                amountEyePin: amountEyePin ? String(amountEyePin).trim() : undefined
            }
        });
    } catch (err) {
        console.error('Error updating PIN settings:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// POST verify PIN
router.post('/pins/verify', async (req, res) => {
    try {
        const { pinType, pin } = req.body; // pinType: 'settings' | 'amount_eye'
        const key = pinType === 'amount_eye' ? 'amount_eye_pin' : 'settings_pin';
        const defaultPin = '1990';

        const setting = await Setting.findOne({ key });
        const validPin = (setting && setting.value) ? String(setting.value).trim() : defaultPin;

        const inputPin = String(pin || '').trim();
        if (inputPin === validPin) {
            return res.status(200).json({ success: true, valid: true });
        } else {
            return res.status(400).json({ success: false, valid: false, message: 'Invalid PIN entered' });
        }
    } catch (err) {
        console.error('Error verifying PIN:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

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
