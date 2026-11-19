const express = require('express');
const router = express.Router();
const RobotriqLead = require('../models/RobotriqLead');
const Customer = require('../models/Customer');

// Helper to sync Customer data when Sale Created
const syncCustomerSaleData = async (lead, saleData) => {
    try {
        let customerId = lead.customer?._id || lead.customer;
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
                await RobotriqLead.findByIdAndUpdate(lead._id, { customer: customerId });
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
            const allLeads = await RobotriqLead.find({ 
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
        console.error("Error syncing customer sale data in RobotriqLead:", err);
    }
};

// 1. Get all Robotriq leads
router.get('/', async (req, res) => {
    try {
        const leads = await RobotriqLead.find()
            .populate('customer')
            .populate('assignedEmployee', 'fullName email')
            .sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: leads });
    } catch (error) {
        console.error("Error fetching Robotriq leads:", error);
        res.status(500).json({ success: false, message: "Error fetching leads", error: error.message });
    }
});

// 2. Create new Robotriq lead (Auto-generate enquiryId: RQ-ENQ-001)
router.post('/', async (req, res) => {
    try {
        // Find latest RQ-ENQ ID
        const lastLead = await RobotriqLead.findOne({}, { enquiryId: 1 }).sort({ enquiryId: -1 });
        let nextIdNumber = 1;
        if (lastLead && lastLead.enquiryId && lastLead.enquiryId.startsWith('RQ-ENQ-')) {
            const parts = lastLead.enquiryId.split('-');
            const lastIdNum = parseInt(parts[parts.length - 1]);
            if (!isNaN(lastIdNum)) {
                nextIdNumber = lastIdNum + 1;
            }
        } else {
            const count = await RobotriqLead.countDocuments();
            nextIdNumber = count + 1;
        }
        const nextId = `RQ-ENQ-${nextIdNumber.toString().padStart(3, '0')}`;

        const payload = { ...req.body };
        if (!payload.assignedEmployee) delete payload.assignedEmployee;
        if (!payload.customer) delete payload.customer;

        if (payload.fullPayment !== undefined || payload.billAmount !== undefined) {
            const bill = Number(payload.fullPayment !== undefined ? payload.fullPayment : payload.billAmount) || 0;
            const adv = Number(payload.advancePayment !== undefined ? payload.advancePayment : 0) || 0;
            payload.billAmount = bill;
            payload.fullPayment = bill;
            payload.balancePayment = bill - adv;
        }

        if (payload.status === 'Lost Lead' && payload.lostReason) {
            payload.lostDate = payload.lostDate || new Date();
            const currentDetails = payload.enquiryDetails || '';
            if (!currentDetails.includes(payload.lostReason)) {
                payload.enquiryDetails = currentDetails 
                    ? `${currentDetails}\n\n[Lost Lead Reason: ${payload.lostReason}]` 
                    : `Lost Lead Reason: ${payload.lostReason}`;
            }
        }

        const newLead = await RobotriqLead.create({
            ...payload,
            enquiryId: nextId
        });

        if (newLead.status === 'Sale Created') {
            await syncCustomerSaleData(newLead, payload);
        }

        const populatedLead = await RobotriqLead.findById(newLead._id)
            .populate('customer')
            .populate('assignedEmployee', 'fullName email');

        res.status(201).json({ success: true, data: populatedLead });
    } catch (error) {
        console.error("Error creating Robotriq lead:", error);
        res.status(500).json({ success: false, message: "Error creating lead", error: error.message });
    }
});

// 3. Update Robotriq lead
router.put('/:id', async (req, res) => {
    try {
        const payload = { ...req.body };
        if (!payload.assignedEmployee) delete payload.assignedEmployee;
        if (!payload.customer) delete payload.customer;

        if (payload.fullPayment !== undefined || payload.billAmount !== undefined) {
            const bill = Number(payload.fullPayment !== undefined ? payload.fullPayment : payload.billAmount) || 0;
            const adv = Number(payload.advancePayment !== undefined ? payload.advancePayment : 0) || 0;
            payload.billAmount = bill;
            payload.fullPayment = bill;
            payload.balancePayment = bill - adv;
        }

        if (payload.status === 'Lost Lead') {
            payload.lostDate = payload.lostDate || new Date();
            if (payload.lostReason) {
                const existingLead = await RobotriqLead.findById(req.params.id);
                const currentDetails = payload.enquiryDetails !== undefined ? payload.enquiryDetails : (existingLead?.enquiryDetails || '');
                if (!currentDetails.includes(payload.lostReason)) {
                    payload.enquiryDetails = currentDetails 
                        ? `${currentDetails}\n\n[Lost Lead Reason: ${payload.lostReason}]` 
                        : `Lost Lead Reason: ${payload.lostReason}`;
                }
            }
        }

        if (payload.status === 'Sale Created') {
            const existingLead = await RobotriqLead.findById(req.params.id);
            if (existingLead && !existingLead.saleCreatedDate && !payload.saleCreatedDate) {
                payload.saleCreatedDate = new Date();
            }
        }

        const updatedLead = await RobotriqLead.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        ).populate('customer').populate('assignedEmployee', 'fullName email');

        if (!updatedLead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }

        if (payload.status === 'Sale Created' || (updatedLead && updatedLead.status === 'Sale Created')) {
            await syncCustomerSaleData(updatedLead, payload);
        }

        res.status(200).json({ success: true, data: updatedLead });
    } catch (error) {
        console.error("Error updating Robotriq lead:", error);
        res.status(500).json({ success: false, message: "Error updating lead", error: error.message });
    }
});

// 4. Delete Robotriq lead
router.delete('/:id', async (req, res) => {
    try {
        const deletedLead = await RobotriqLead.findByIdAndDelete(req.params.id);
        if (!deletedLead) {
            return res.status(404).json({ success: false, message: "Lead not found" });
        }
        res.status(200).json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
        console.error("Error deleting Robotriq lead:", error);
        res.status(500).json({ success: false, message: "Error deleting lead", error: error.message });
    }
});

module.exports = router;
