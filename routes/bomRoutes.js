const express = require('express');
const router = express.Router();
const BOM = require('../models/BOM');
const SalesLead = require('../models/SalesLead');

router.get('/', async (req, res) => {
    try {
        const boms = await BOM.find()
            .populate({
                path: 'lead',
                populate: { path: 'customer' }
            })
            .populate('items.item')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: boms });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching BOMs" });
    }
});

router.post('/', async (req, res) => {
    try {
        const newBOM = await BOM.create(req.body);
        // Automatically update lead status
        if(req.body.lead) {
            await SalesLead.findByIdAndUpdate(req.body.lead, { status: 'BOM created' });
        }
        res.status(201).json({ success: true, data: newBOM });
    } catch (error) {
        console.error("BOM Create Error:", error);
        res.status(500).json({ success: false, message: "Error creating BOM", error: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const updatedBOM = await BOM.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedBOM });
    } catch (error) {
        console.error("BOM Update Error:", error);
        res.status(500).json({ success: false, message: "Error updating BOM", error: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await BOM.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "BOM deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting BOM" });
    }
});

module.exports = router;
