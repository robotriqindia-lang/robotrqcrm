const express = require('express');
const router = express.Router();
const AdminQuotation = require('../models/AdminQuotation');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const RobotriqLead = require('../models/RobotriqLead');

router.get('/', async (req, res) => {
    try {
        const quotations = await AdminQuotation.find()
            .populate('lead')
            .populate('customer')
            .populate('robotriqLead')
            .populate('items.item')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching AdminQuotations" });
    }
});

router.post('/', async (req, res) => {
    try {
        // Generate AdminQuotation No (e.g. RQ/2026/001)
        const currentYear = new Date().getFullYear();
        const count = await AdminQuotation.countDocuments({
            createdAt: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        });
        const quotationNo = `RQ/${currentYear}/${(count + 1).toString().padStart(3, '0')}`;
        if (req.body.customData) req.body.customData.quotationNo = quotationNo;
        
        const payload = { ...req.body };
        if (!payload.lead) delete payload.lead;
        if (!payload.customer) delete payload.customer;
        if (!payload.robotriqLead) delete payload.robotriqLead;

        const newAdminQuotation = await AdminQuotation.create({ ...payload, quotationNo });
        
        res.status(201).json({ success: true, data: newAdminQuotation });
    } catch (error) {
        console.error("AdminQuotation creation error:", error);
        res.status(500).json({ success: false, message: "Error creating AdminQuotation" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await AdminQuotation.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "AdminQuotation deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting AdminQuotation" });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.lead) delete payload.lead;
        if (!payload.customer) delete payload.customer;
        if (!payload.robotriqLead) delete payload.robotriqLead;

        const updatedAdminQuotation = await AdminQuotation.findByIdAndUpdate(
            req.params.id, 
            payload, 
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: updatedAdminQuotation });
    } catch (error) {
        console.error("AdminQuotation update error:", error);
        res.status(500).json({ success: false, message: "Error updating AdminQuotation" });
    }
});

module.exports = router;
