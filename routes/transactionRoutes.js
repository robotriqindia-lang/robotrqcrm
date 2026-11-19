const express = require('express');
const router = express.Router();
const Account = require('../models/Account'); // Path சரியா இருக்கான்னு பாத்துக்கோங்க

// ✅ 1. எல்லா Income/Expense டேட்டாவையும் எடுக்க (GET: /api/accounts)
router.get('/', async (req, res) => {
    try {
        const transactions = await Account.find().sort({ createdAt: -1 });
        res.json({ success: true, data: transactions });
    } catch (err) {
        console.error("GET Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// ✅ 2. புதுசா ஒரு ரெக்கார்ட் ஆட் பண்ண (POST: /api/accounts)
router.post('/', async (req, res) => {
    const { type, date, desc, amount } = req.body;
    
    if (!type || !date || !desc || !amount) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    const newEntry = new Account({
        type,
        date,
        desc,
        amount: Number(amount)
    });

    try {
        const savedEntry = await newEntry.save();
        res.status(201).json({ success: true, data: savedEntry });
    } catch (err) {
        res.status(400).json({ success: false, message: err.message });
    }
});

// ✅ 3. ஒரு ரெக்கார்டை டெலீட் பண்ண (DELETE: /api/accounts/:id)
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deletedItem = await Account.findByIdAndDelete(id);
        
        if (!deletedItem) {
            return res.status(404).json({ success: false, message: "Record not found!" });
        }

        res.json({ success: true, message: "Deleted successfully! 🗑️" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error while deleting!" });
    }
});

// ✅ 4. அப்டேட் பண்ண (PUT: /api/accounts/:id)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedEntry = await Account.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedEntry) {
            return res.status(404).json({ success: false, message: "Record not found!" });
        }
        res.json({ success: true, data: updatedEntry });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server error while updating!" });
    }
});

module.exports = router;