const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// 1. Get all customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: customers });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).json({ success: false, message: "Error fetching customers", error: error.message });
    }
});

// 2. Create new customer
router.post('/', async (req, res) => {
    try {
        const { companyName, customerName, phone, email, gstNo, address } = req.body;
        if (!customerName && !companyName) {
            return res.status(400).json({ success: false, message: "Customer Name or Company Name is required" });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }
        if (!address || !address.trim()) {
            return res.status(400).json({ success: false, message: "Office / Billing Address is required" });
        }
        
        const newCustomer = await Customer.create({
            companyName: companyName || '',
            customerName: customerName || companyName,
            phone: phone || '',
            email: email || '',
            gstNo: gstNo || '',
            address: address || ''
        });

        res.status(201).json({ success: true, data: newCustomer });
    } catch (error) {
        console.error("Error creating customer:", error);
        res.status(500).json({ success: false, message: "Error creating customer", error: error.message });
    }
});

// 3. Update customer
router.put('/:id', async (req, res) => {
    try {
        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!updatedCustomer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        res.status(200).json({ success: true, data: updatedCustomer });
    } catch (error) {
        console.error("Error updating customer:", error);
        res.status(500).json({ success: false, message: "Error updating customer", error: error.message });
    }
});

// 4. Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
        if (!deletedCustomer) {
            return res.status(404).json({ success: false, message: "Customer not found" });
        }
        res.status(200).json({ success: true, message: "Customer deleted successfully" });
    } catch (error) {
        console.error("Error deleting customer:", error);
        res.status(500).json({ success: false, message: "Error deleting customer", error: error.message });
    }
});

module.exports = router;
