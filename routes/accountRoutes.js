const express = require('express');
const router = express.Router();
const Account = require('../models/Account'); // உங்க Model இருக்குற சரியான Path-ஐ குடுங்க

// 🚀 1. எல்லா Income/Expense டேட்டாவையும் எடுக்க (GET)
router.get('/', async (req, res) => {
    try {
        const transactions = await Account.find().sort({ createdAt: -1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🚀 2. புதுசா ஒரு Income அல்லது Expense ஆட் பண்ண (POST)
router.post('/', async (req, res) => {
    const { type, date, desc, amount } = req.body;
    
    const newEntry = new Account({
        type,
        date,
        desc,
        amount
    });

    try {
        const savedEntry = await newEntry.save();
        res.status(201).json({ success: true, data: savedEntry });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// 🚀 3. ஒரு ரெக்கார்டை டெலீட் பண்ண (DELETE)
router.delete('/:id', async (req, res) => {
    try {
        await Account.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Record deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;