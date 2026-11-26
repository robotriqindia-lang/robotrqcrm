const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const dashboardRoutes = require('./dashboardRoutes');

// GET: Fetch expenses for a specific employee
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const query = Expense.find({ employeeId: req.params.employeeId }).sort({ date: -1, createdAt: -1 });
        if (req.query.limit && req.query.limit !== 'all' && req.query.limit !== '0') {
            const lim = parseInt(req.query.limit);
            if (lim > 0) query.limit(lim);
        }
        const expenses = await query;
        res.json({ success: true, data: expenses });
    } catch (err) {
        console.error("GET Employee Expense Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET: Fetch all employee expenses (Admin View)
router.get('/', async (req, res) => {
    try {
        const expenses = await Expense.find().sort({ date: -1, createdAt: -1 });
        res.json({ success: true, data: expenses });
    } catch (err) {
        console.error("GET Expense Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// POST: Submit a new employee expense (Employee Dashboard) or Allocation (Admin)
router.post('/', async (req, res) => {
    const { employeeId, employeeName, date, description, amount, type, category, paymentMode } = req.body;
    
    if (!employeeId || !employeeName || !date || !description || !amount) {
        return res.status(400).json({ success: false, message: "All fields are required!" });
    }

    try {
        const newExpense = new Expense({
            employeeId,
            employeeName,
            date,
            description,
            amount: Number(amount),
            type: type || 'Expense',
            category: category || 'General',
            paymentMode: paymentMode || 'Cash'
        });

        const savedExpense = await newExpense.save();
        if (dashboardRoutes.clearSummaryCache) dashboardRoutes.clearSummaryCache(employeeId);
        res.status(201).json({ success: true, data: savedExpense });
    } catch (err) {
        console.error("POST Expense Error:", err);
        res.status(400).json({ success: false, message: err.message });
    }
});

// DELETE: Delete an expense record
router.delete('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const deletedExpense = await Expense.findByIdAndDelete(id);
        
        if (!deletedExpense) {
            return res.status(404).json({ success: false, message: "Expense not found!" });
        }

        if (dashboardRoutes.clearSummaryCache) dashboardRoutes.clearSummaryCache(deletedExpense.employeeId);
        res.json({ success: true, message: "Expense deleted successfully!" });
    } catch (err) {
        console.error("DELETE Expense Error:", err);
        res.status(500).json({ success: false, message: "Server error while deleting expense!" });
    }
});

// PUT: Update an expense record (e.g. status)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const updatedExpense = await Expense.findByIdAndUpdate(id, { $set: req.body }, { new: true });
        
        if (!updatedExpense) {
            return res.status(404).json({ success: false, message: "Expense not found!" });
        }

        if (dashboardRoutes.clearSummaryCache) dashboardRoutes.clearSummaryCache(updatedExpense.employeeId);
        res.json({ success: true, data: updatedExpense });
    } catch (err) {
        console.error("PUT Expense Error:", err);
        res.status(500).json({ success: false, message: "Server error while updating expense!" });
    }
});

module.exports = router;
