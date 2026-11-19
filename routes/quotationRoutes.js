const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const SalesLead = require('../models/SalesLead');

router.get('/', async (req, res) => {
    try {
        const quotations = await Quotation.find().populate('lead').populate('items.item').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: quotations });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching Quotations" });
    }
});

router.post('/', async (req, res) => {
    try {
        // Generate Quotation No (e.g. MP/2026/001)
        const currentYear = new Date().getFullYear();
        const count = await Quotation.countDocuments({
            createdAt: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        });
        const quotationNo = `MP/${currentYear}/${(count + 1).toString().padStart(3, '0')}`;
        if (req.body.customData) req.body.customData.quotationNo = quotationNo;
        
        const newQuotation = await Quotation.create({ ...req.body, quotationNo });
        
        // Auto update lead status
        if(req.body.lead) {
            await SalesLead.findByIdAndUpdate(req.body.lead, { status: 'Quotation Created' });
        }
        
        res.status(201).json({ success: true, data: newQuotation });
    } catch (error) {
        console.error("Quotation creation error:", error);
        res.status(500).json({ success: false, message: "Error creating Quotation" });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await Quotation.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Quotation deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting Quotation" });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedQuotation = await Quotation.findByIdAndUpdate(
            req.params.id, 
            { ...req.body }, 
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: updatedQuotation });
    } catch (error) {
        console.error("Quotation update error:", error);
        res.status(500).json({ success: false, message: "Error updating Quotation" });
    }
});

module.exports = router;
