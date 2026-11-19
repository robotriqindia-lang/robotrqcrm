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
        const record = await Account.findById(req.params.id);
        if (!record) return res.status(404).json({ success: false, message: "Record not found" });

        // Receipt-ah iruntha student balance-la irunthu kuraikanum
        if (record.type === 'Income' && record.desc && record.desc.startsWith('Receipt:')) {
            const User = require('../models/User');
            const orderMatch = record.desc.match(/\(Order:\s*([^)]+)\)/);
            if (orderMatch) {
                const orderId = orderMatch[1];
                const student = await User.findOne({ 
                    $or: [ { orderId: orderId }, { studentId: orderId } ]
                });
                if (student) {
                    const newPaidAmount = Math.max(0, (Number(student.paidAmount) || 0) - Number(record.amount));
                    student.paidAmount = newPaidAmount;
                    await student.save();
                }
            }
        }

        await Account.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Record deleted successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 🚀 4. ரெக்கார்டை அப்டேட் பண்ண (PUT) - Status update-kum idhu thaan use aagum
router.put('/:id', async (req, res) => {
    try {
        const updatedRecord = await Account.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true }
        );
        if (!updatedRecord) return res.status(404).json({ success: false, message: "Record not found" });
        res.json({ success: true, data: updatedRecord });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;