const express = require('express');
const router = express.Router();
const SalesLead = require('../models/SalesLead');
const Customer = require('../models/Customer');

// Helper to sync Customer data when Sale Created
const syncCustomerSaleData = async (lead, saleData) => {
    try {
        let customerId = lead.customer;
        // If not linked to Customer, find or create customer
        if (!customerId) {
            let cust = null;
            if (lead.phone && lead.phone.trim()) {
                cust = await Customer.findOne({ phone: lead.phone.trim() });
            }
            if (!cust && lead.companyName && lead.companyName.trim()) {
                cust = await Customer.findOne({ companyName: new RegExp(`^${lead.companyName.trim()}$`, 'i') });
            }
            if (!cust && lead.customerName && lead.customerName.trim()) {
                cust = await Customer.findOne({ customerName: new RegExp(`^${lead.customerName.trim()}$`, 'i') });
            }
            if (!cust && (lead.customerName || lead.companyName)) {
                cust = await Customer.create({
                    companyName: lead.companyName || '',
                    customerName: lead.customerName || lead.companyName || 'Unknown Customer',
                    phone: lead.phone || '',
                    email: lead.email || '',
                    address: ''
                });
            }
            if (cust) {
                customerId = cust._id;
                await SalesLead.findByIdAndUpdate(lead._id, { customer: customerId });
            }
        }

        if (customerId) {
            const billNo = saleData.billNo || lead.billNo || '';
            const billAmount = Number(saleData.fullPayment !== undefined ? saleData.fullPayment : (saleData.billAmount !== undefined ? saleData.billAmount : lead.fullPayment)) || 0;
            const advance = Number(saleData.advancePayment !== undefined ? saleData.advancePayment : lead.advancePayment) || 0;
            const balance = billAmount - advance;
            const saleDate = saleData.saleCreatedDate || lead.saleCreatedDate || new Date();

            await Customer.findByIdAndUpdate(customerId, {
                $set: {
                    billNo: billNo,
                    lastBillNo: billNo,
                    lastSaleDate: saleDate,
                    lastBillAmount: billAmount,
                    lastAdvancePayment: advance,
                    lastBalancePayment: balance
                }
            });

            // Recalculate totals for this customer across all closed leads
            const allLeads = await SalesLead.find({ 
                $or: [{ customer: customerId }, { phone: lead.phone }] 
            });
            const closedLeads = allLeads.filter(l => l.status === 'Sale Created' || l.status === 'Full Payment Received' || l.accountCompleted);
            const totalSales = closedLeads.reduce((sum, l) => sum + (Number(l.fullPayment) || Number(l.billAmount) || 0), 0);
            const totalAdv = closedLeads.reduce((sum, l) => sum + (Number(l.advancePayment) || 0), 0);
            
            await Customer.findByIdAndUpdate(customerId, {
                totalSalesValue: totalSales,
                totalAdvance: totalAdv,
                balanceDue: totalSales - totalAdv
            });
        }
    } catch (err) {
        console.error("Error syncing customer sale data:", err);
    }
};

// 1. Get all leads
router.get('/', async (req, res) => {
    try {
        const leads = await SalesLead.find().populate('customer').sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: leads });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching leads" });
    }
});

// 2. Create new lead (Auto-generate enquiryId)
router.post('/', async (req, res) => {
    try {
        // Find the latest ENQ id explicitly (sorting by enquiryId to correctly get the highest number)
        const lastLead = await SalesLead.findOne({}, { enquiryId: 1 }).sort({ enquiryId: -1 });
        let nextIdNumber = 1;
        if (lastLead && lastLead.enquiryId && lastLead.enquiryId.startsWith('ENQ-')) {
            const lastIdNum = parseInt(lastLead.enquiryId.split('-')[1]);
            if (!isNaN(lastIdNum)) {
                nextIdNumber = lastIdNum + 1;
            }
        } else {
            const count = await SalesLead.countDocuments();
            nextIdNumber = count + 1;
        }
        const nextId = `ENQ-${nextIdNumber.toString().padStart(3, '0')}`;
        
        if (!req.body.assignedEmployee) delete req.body.assignedEmployee;
        if (req.body.fullPayment !== undefined || req.body.billAmount !== undefined) {
            const bill = Number(req.body.fullPayment !== undefined ? req.body.fullPayment : req.body.billAmount) || 0;
            const adv = Number(req.body.advancePayment !== undefined ? req.body.advancePayment : 0) || 0;
            req.body.billAmount = bill;
            req.body.fullPayment = bill;
            req.body.balancePayment = bill - adv;
        }
        if (req.body.status === 'Lost Lead' && req.body.lostReason) {
            req.body.lostDate = req.body.lostDate || new Date();
            const currentDetails = req.body.enquiryDetails || '';
            if (!currentDetails.includes(req.body.lostReason)) {
                req.body.enquiryDetails = currentDetails 
                    ? `${currentDetails}\n\n[Lost Lead Reason: ${req.body.lostReason}]` 
                    : `Lost Lead Reason: ${req.body.lostReason}`;
            }
        }
        const newLead = await SalesLead.create({ ...req.body, enquiryId: nextId });
        if (newLead.status === 'Sale Created') {
            await syncCustomerSaleData(newLead, req.body);
        }
        res.status(201).json({ success: true, data: newLead });
    } catch (error) {
        console.error("Error creating lead:", error);
        res.status(500).json({ success: false, message: "Error creating lead", error: error.message });
    }
});

// 3. Update lead (e.g., status update)
router.put('/:id', async (req, res) => {
    try {
        if (!req.body.assignedEmployee) delete req.body.assignedEmployee;
        if (req.body.fullPayment !== undefined || req.body.billAmount !== undefined) {
            const bill = Number(req.body.fullPayment !== undefined ? req.body.fullPayment : req.body.billAmount) || 0;
            const adv = Number(req.body.advancePayment !== undefined ? req.body.advancePayment : 0) || 0;
            req.body.billAmount = bill;
            req.body.fullPayment = bill;
            req.body.balancePayment = bill - adv;
        }
        if (req.body.status === 'Lost Lead') {
            req.body.lostDate = req.body.lostDate || new Date();
            if (req.body.lostReason) {
                const existingLead = await SalesLead.findById(req.params.id);
                const currentDetails = req.body.enquiryDetails !== undefined ? req.body.enquiryDetails : (existingLead?.enquiryDetails || '');
                if (!currentDetails.includes(req.body.lostReason)) {
                    req.body.enquiryDetails = currentDetails 
                        ? `${currentDetails}\n\n[Lost Lead Reason: ${req.body.lostReason}]` 
                        : `Lost Lead Reason: ${req.body.lostReason}`;
                }
            }
        }
        if (req.body.status === 'Sale Created') {
            const existingLead = await SalesLead.findById(req.params.id);
            if (existingLead && !existingLead.saleCreatedDate && !req.body.saleCreatedDate) {
                req.body.saleCreatedDate = new Date();
            }
        }
        const updatedLead = await SalesLead.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (req.body.status === 'Sale Created' || (updatedLead && updatedLead.status === 'Sale Created')) {
            await syncCustomerSaleData(updatedLead, req.body);
        }
        res.status(200).json({ success: true, data: updatedLead });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating lead" });
    }
});

// 4. Delete lead
router.delete('/:id', async (req, res) => {
    try {
        await SalesLead.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Lead deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting lead" });
    }
});

module.exports = router;
