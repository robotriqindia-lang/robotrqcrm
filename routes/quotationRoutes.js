const express = require('express');
const router = express.Router();
const Quotation = require('../models/Quotation');
const SalesLead = require('../models/SalesLead');

const getNextQuotationNo = async (prefix = 'MP') => {
    const currentYear = new Date().getFullYear();
    const pattern = new RegExp(`^${prefix}/${currentYear}/(\\d+)`);
    const existing = await Quotation.find({ quotationNo: pattern }, 'quotationNo').lean();
    
    let maxSeq = 0;
    for (const q of existing) {
        const match = q.quotationNo && q.quotationNo.match(pattern);
        if (match && match[1]) {
            const num = parseInt(match[1], 10);
            if (!isNaN(num) && num > maxSeq) {
                maxSeq = num;
            }
        }
    }
    
    if (maxSeq === 0) {
        const count = await Quotation.countDocuments({
            createdAt: {
                $gte: new Date(`${currentYear}-01-01`),
                $lte: new Date(`${currentYear}-12-31`)
            }
        });
        maxSeq = count;
    }
    
    return `${prefix}/${currentYear}/${String(maxSeq + 1).padStart(3, '0')}`;
};

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
        let qNo = (req.body.quotationNo || req.body.customData?.quotationNo || '').trim();
        // If no quotationNo provided or it has placeholder like 'MP/2026/...', generate next sequence
        if (!qNo || qNo.includes('...')) {
            qNo = await getNextQuotationNo('MP');
        }
        const quotationNo = qNo;
        
        const payload = { ...req.body, quotationNo };
        if (payload.customData) {
            payload.customData.quotationNo = quotationNo;
        }

        // Round off totalAmount, transportAmount, netAmount (except GST)
        if (payload.totalAmount !== undefined) payload.totalAmount = Math.round(Number(payload.totalAmount) || 0);
        if (payload.transportAmount !== undefined) payload.transportAmount = Math.round(Number(payload.transportAmount) || 0);
        if (payload.netAmount !== undefined) payload.netAmount = Math.round(Number(payload.netAmount) || 0);
        if (payload.customData) {
            if (payload.customData.totalAmount !== undefined) payload.customData.totalAmount = Math.round(Number(payload.customData.totalAmount) || 0);
            if (payload.customData.transportAmount !== undefined) payload.customData.transportAmount = Math.round(Number(payload.customData.transportAmount) || 0);
            if (payload.customData.netAmount !== undefined) payload.customData.netAmount = Math.round(Number(payload.customData.netAmount) || 0);
        }
        
        const newQuotation = await Quotation.create(payload);
        
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
        const payload = { ...req.body };
        // Round off totalAmount, transportAmount, netAmount (except GST)
        if (payload.totalAmount !== undefined) payload.totalAmount = Math.round(Number(payload.totalAmount) || 0);
        if (payload.transportAmount !== undefined) payload.transportAmount = Math.round(Number(payload.transportAmount) || 0);
        if (payload.netAmount !== undefined) payload.netAmount = Math.round(Number(payload.netAmount) || 0);
        if (payload.customData) {
            if (payload.customData.totalAmount !== undefined) payload.customData.totalAmount = Math.round(Number(payload.customData.totalAmount) || 0);
            if (payload.customData.transportAmount !== undefined) payload.customData.transportAmount = Math.round(Number(payload.customData.transportAmount) || 0);
            if (payload.customData.netAmount !== undefined) payload.customData.netAmount = Math.round(Number(payload.customData.netAmount) || 0);
        }

        const updatedQuotation = await Quotation.findByIdAndUpdate(
            req.params.id, 
            payload, 
            { new: true, runValidators: true }
        );
        res.status(200).json({ success: true, data: updatedQuotation });
    } catch (error) {
        console.error("Quotation update error:", error);
        res.status(500).json({ success: false, message: "Error updating Quotation" });
    }
});

module.exports = router;
